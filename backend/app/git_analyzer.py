import logging
from datetime import datetime
import os
import re
import git
from pydriller import Repository as PyDrillerRepo
from pydriller.domain.commit import ModificationType
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Repository, Commit, Contributor, FileChange, DailyMetric

logger = logging.getLogger(__name__)

def analyze_file_complexity(content: str, file_ext: str) -> dict:
    if not content:
        return {"functions": 0, "conditionals": 0, "loops": 0, "max_depth": 0, "score": 0.0}
    
    lines = content.splitlines()
    functions = 0
    conditionals = 0
    loops = 0
    max_depth = 0
    
    ext = file_ext.lower().strip(".")
    
    # 1. Nesting depth calculation
    if ext == "py":
        for line in lines:
            stripped = line.lstrip()
            if not stripped or stripped.startswith('#'):
                continue
            indent = len(line) - len(stripped)
            depth = indent // 4 if line.startswith(' ') else indent
            if depth > max_depth:
                max_depth = depth
    else:
        # Brace-based languages
        current_depth = 0
        for line in lines:
            open_c = line.count('{')
            close_c = line.count('}')
            current_depth += open_c - close_c
            if current_depth > max_depth:
                max_depth = current_depth
            if current_depth < 0:
                current_depth = 0
                
    # 2. Count metrics
    if ext == "py":
        for line in lines:
            if re.search(r'^\s*(def|class)\b', line):
                functions += 1
            if re.search(r'\b(if|elif|else)\b', line):
                conditionals += 1
            if re.search(r'\b(for|while)\b', line):
                loops += 1
    elif ext in ["js", "jsx", "ts", "tsx"]:
        for line in lines:
            if re.search(r'\b(function|class|constructor)\b', line) or "=>" in line:
                functions += 1
            if re.search(r'\b(if|else|switch|case)\b', line):
                conditionals += 1
            if re.search(r'\b(for|while)\b', line):
                loops += 1
    else:
        # Fallback for others
        for line in lines:
            if re.search(r'\b(function|fn|class|def|void|int|float|double|public|private)\b\s+\w+\s*\(', line):
                functions += 1
            if re.search(r'\b(if|else|switch|case|elif)\b', line):
                conditionals += 1
            if re.search(r'\b(for|while|loop)\b', line):
                loops += 1

    score = (functions * 2.0) + (conditionals * 1.5) + (loops * 2.0) + (max_depth * 3.0)
    return {
        "functions": functions,
        "conditionals": conditionals,
        "loops": loops,
        "max_depth": max_depth,
        "score": round(score, 2)
    }


def analyze_repository(repo_id: int, db: Session):
    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        logger.error(f"Repository with ID {repo_id} not found in DB.")
        return

    try:
        repo_record.status = "analyzing"
        db.commit()

        # Determine path
        repo_path = repo_record.local_path
        if repo_record.url:
            # Remote URL, clone it
            clone_dir = settings.REPOS_DIR / f"repo_{repo_id}"
            if not clone_dir.exists():
                logger.info(f"Cloning {repo_record.url} to {clone_dir}")
                git.Repo.clone_from(repo_record.url, clone_dir)
            repo_path = str(clone_dir)

        if not repo_path or not os.path.exists(repo_path):
            raise Exception("Invalid repository path or directory does not exist.")

        logger.info(f"Starting Git analysis on path: {repo_path}")
        
        # Track contributors to avoid duplicate db lookups
        contributors_cache = {}

        # Scan commits chronologically (oldest to newest)
        driller = PyDrillerRepo(repo_path, order='reverse')  # PyDriller 'reverse' means reverse of default (which is reverse chronological), so this is chronological!
        
        active_files = {}  # filepath: line_count
        active_complexities = {}  # filepath: complexity_dict
        daily_stats = {}  # date: (total_files, total_lines, set(contributors))

        for idx, commit in enumerate(driller.traverse_commits()):
            author_email = commit.author.email or "unknown"
            author_name = commit.author.name or "Unknown"

            # 1. Update contributor stats
            contr_key = (author_name, author_email)
            if contr_key not in contributors_cache:
                db_contr = db.query(Contributor).filter(
                    Contributor.repository_id == repo_id,
                    Contributor.email == author_email,
                    Contributor.name == author_name
                ).first()
                if not db_contr:
                    db_contr = Contributor(
                        repository_id=repo_id,
                        name=author_name,
                        email=author_email,
                        total_commits=0,
                        lines_added=0,
                        lines_deleted=0
                    )
                    db.add(db_contr)
                    db.commit()
                contributors_cache[contr_key] = db_contr
            
            contributor = contributors_cache[contr_key]
            contributor.total_commits += 1
            contributor.lines_added += commit.insertions or 0
            contributor.lines_deleted += commit.deletions or 0

            # 2. Add Commit
            committed_dt = commit.author_date
            # Ensure it is timezone-naive for SQLite / SQLAlchemy Datetime fields
            if committed_dt.tzinfo is not None:
                committed_dt = committed_dt.replace(tzinfo=None)

            db_commit = Commit(
                repository_id=repo_id,
                hash=commit.hash,
                author_name=author_name,
                author_email=author_email,
                message=commit.msg,
                committed_at=committed_dt,
                lines_added=commit.insertions or 0,
                lines_deleted=commit.deletions or 0,
                files_changed=commit.files or 0
            )
            db.add(db_commit)
            db.flush()  # To get db_commit.id for relations

            # 3. Add File Changes
            for m_file in commit.modified_files:
                filepath = m_file.new_path or m_file.old_path or ""
                if not filepath:
                    continue
                
                # Determine change type
                if m_file.change_type == ModificationType.ADD:
                    ctype = "ADD"
                elif m_file.change_type == ModificationType.DELETE:
                    ctype = "DELETE"
                elif m_file.change_type == ModificationType.RENAME:
                    ctype = "RENAME"
                else:
                    ctype = "MODIFY"

                # Ext/Language detection
                file_ext = os.path.splitext(filepath)[1].lower().strip(".") if filepath else ""

                added_lines = m_file.added_lines or 0
                deleted_lines = m_file.deleted_lines or 0

                # Track lines for this file change
                lines = 0
                if m_file.change_type == ModificationType.ADD:
                    lines = max(0, added_lines - deleted_lines)
                elif m_file.change_type == ModificationType.DELETE:
                    lines = 0
                elif m_file.change_type == ModificationType.RENAME:
                    old_path = m_file.old_path
                    old_c = active_complexities.pop(old_path, {"lines": 0, "functions": 0, "conditionals": 0, "loops": 0, "max_depth": 0, "score": 0.0})
                    lines = max(0, old_c["lines"] + added_lines - deleted_lines)
                else:  # MODIFY
                    old_c = active_complexities.get(filepath, {"lines": 0, "functions": 0, "conditionals": 0, "loops": 0, "max_depth": 0, "score": 0.0})
                    lines = max(0, old_c["lines"] + added_lines - deleted_lines)

                # Compute complexity
                if m_file.change_type == ModificationType.DELETE:
                    c_metrics = {"functions": 0, "conditionals": 0, "loops": 0, "max_depth": 0, "score": 0.0}
                    active_complexities.pop(filepath, None)
                    active_files.pop(filepath, None)
                else:
                    if m_file.source_code is not None:
                        c_metrics = analyze_file_complexity(m_file.source_code, file_ext)
                    else:
                        # Fallback for binary / missing content
                        c_metrics = {
                            "functions": lines // 30,
                            "conditionals": lines // 15,
                            "loops": lines // 25,
                            "max_depth": min(5, lines // 20),
                            "score": round((lines // 30)*2.0 + (lines // 15)*1.5 + (lines // 25)*2.0 + min(5, lines // 20)*3.0, 2)
                        }
                    
                    # Update active registries
                    active_complexities[filepath] = {
                        "lines": lines,
                        "functions": c_metrics["functions"],
                        "conditionals": c_metrics["conditionals"],
                        "loops": c_metrics["loops"],
                        "max_depth": c_metrics["max_depth"],
                        "score": c_metrics["score"]
                    }
                    active_files[filepath] = lines

                db_change = FileChange(
                    commit_id=db_commit.id,
                    filepath=filepath,
                    change_type=ctype,
                    lines_added=added_lines,
                    lines_deleted=deleted_lines,
                    file_type=file_ext if file_ext else "unknown",
                    complexity_score=c_metrics["score"],
                    functions=c_metrics["functions"],
                    conditionals=c_metrics["conditionals"],
                    loops=c_metrics["loops"],
                    max_depth=c_metrics["max_depth"]
                )
                db.add(db_change)

            # Record complexity stats on commit
            total_lines = sum(c["lines"] for c in active_complexities.values())
            file_count = len(active_complexities)
            average_file_size = total_lines / file_count if file_count > 0 else 0.0
            complexity_score = sum(c["score"] for c in active_complexities.values())

            db_commit.total_lines = total_lines
            db_commit.file_count = file_count
            db_commit.average_file_size = average_file_size
            db_commit.complexity_score = complexity_score

            # Record daily stats
            commit_date = committed_dt.date()
            total_files = file_count

            if commit_date not in daily_stats:
                daily_stats[commit_date] = {
                    "total_files": total_files,
                    "total_lines": total_lines,
                    "authors": {author_email}
                }
            else:
                daily_stats[commit_date]["total_files"] = total_files
                daily_stats[commit_date]["total_lines"] = total_lines
                daily_stats[commit_date]["authors"].add(author_email)

            # Periodic commits to database
            if idx % 100 == 0:
                db.commit()

        # 4. Save Daily Metrics
        for r_date, stats in daily_stats.items():
            metric = DailyMetric(
                repository_id=repo_id,
                record_date=r_date,
                total_files=stats["total_files"],
                total_lines=stats["total_lines"],
                active_contributors_count=len(stats["authors"])
            )
            db.add(metric)

        # Update repo status
        repo_record.status = "completed"
        repo_record.last_analyzed_at = datetime.utcnow()
        db.commit()
        logger.info(f"Successfully completed analysis of repository {repo_id}")

    except Exception as e:
        logger.exception(f"Failed to analyze repository {repo_id}: {str(e)}")
        repo_record.status = "failed"
        db.commit()
