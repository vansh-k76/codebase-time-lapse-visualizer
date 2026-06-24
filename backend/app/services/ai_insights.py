import os
import json
import urllib.request
import urllib.parse
from typing import List, Dict, Any

class BaseAIInsightsProvider:
    def generate_insight(
        self,
        commit_message: str,
        files_changed: List[Dict[str, Any]],
        loc_delta: int,
        complexity_delta: float
    ) -> Dict[str, Any]:
        raise NotImplementedError

class MockAIInsightsProvider(BaseAIInsightsProvider):
    def generate_insight(
        self,
        commit_message: str,
        files_changed: List[Dict[str, Any]],
        loc_delta: int,
        complexity_delta: float
    ) -> Dict[str, Any]:
        # Determine risk score
        files_count = len(files_changed)
        if complexity_delta > 20 or abs(loc_delta) > 150 or files_count > 8:
            risk = "High"
        elif complexity_delta > 5 or abs(loc_delta) > 50 or files_count > 3:
            risk = "Medium"
        else:
            risk = "Low"

        # Determine most impacted files (sorted by total lines added/deleted)
        sorted_files = sorted(files_changed, key=lambda f: f.get('lines_added', 0) + f.get('lines_deleted', 0), reverse=True)
        most_impacted = [f['filepath'] for f in sorted_files[:3] if f.get('filepath')]

        file_names = ", ".join([os.path.basename(f) for f in most_impacted]) if most_impacted else "multiple files"

        # Generate detailed summaries based on commit messages and metrics
        msg_lower = commit_message.lower()
        
        if "fix" in msg_lower or "bug" in msg_lower or "patch" in msg_lower:
            summary = f"Addressed a bug/issue by modifying {file_names}. Focuses on fixing logic errors and improving code stability."
            recommendation = f"Ensure unit tests cover this bug fix in {file_names}. Validate boundary cases and potential null inputs."
        elif "feat" in msg_lower or "add" in msg_lower or "new" in msg_lower:
            summary = f"Implemented new feature capabilities affecting {file_names}. This introduces new code paths and logic blocks."
            recommendation = f"Verify that the new functionality in {file_names} is decoupled from core business logic. Keep methods small and modular."
        elif "refactor" in msg_lower or "clean" in msg_lower or "rewrite" in msg_lower:
            summary = f"Performed structural refactoring on {file_names} to clean up the implementation, improve code readability, and eliminate code smells."
            recommendation = f"Ensure regression tests pass for {file_names}. Double-check that logic flows are simpler and call hierarchies are clean."
        elif "test" in msg_lower or "spec" in msg_lower:
            summary = f"Expanded test coverage for {file_names}. Improves test harness resilience and checks edge-case behaviors."
            recommendation = f"Structure tests to check error/exception flows in addition to positive test paths."
        else:
            summary = f"Modified logic flows in {file_names}. Contributed updates to improve behavior alignment."
            recommendation = f"Ensure modifications in {file_names} are documented and follow team style guides. Keep functions focused."

        # Add metric-specific adjustments
        if complexity_delta > 10:
            summary += f" Noted a complexity increase of +{complexity_delta:.1f} due to added conditional paths or nesting structures."
            recommendation = f"CRITICAL: High complexity growth detected in {file_names}. Break down large functions, extract helper methods, and simplify nested loop/conditional statements to reduce cognitive overhead."
        elif complexity_delta < -2:
            summary += f" Successfully reduced codebase complexity by {abs(complexity_delta):.1f} points, simplifying logic flows."
            recommendation = "Excellent work on simplifying logic! Keep monitoring for potential dead-code regions resulting from the simplification."

        if loc_delta > 100:
            summary += f" Large addition of code (+{loc_delta} lines) which increases the maintenance surface."
            recommendation = recommendation + " Plan a follow-up review to identify any boilerplate code that can be consolidated."

        return {
            "complexity_delta": float(complexity_delta),
            "loc_delta": int(loc_delta),
            "risk_score": risk,
            "most_impacted_files": most_impacted,
            "summary": summary,
            "refactoring_recommendation": recommendation
        }

class GeminiAIInsightsProvider(BaseAIInsightsProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    def generate_insight(
        self,
        commit_message: str,
        files_changed: List[Dict[str, Any]],
        loc_delta: int,
        complexity_delta: float
    ) -> Dict[str, Any]:
        # Formulate fallback mock details
        fallback_provider = MockAIInsightsProvider()
        fallback_data = fallback_provider.generate_insight(commit_message, files_changed, loc_delta, complexity_delta)

        # Call Gemini REST API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        
        file_details = []
        for f in files_changed:
            file_details.append(f"- {f.get('filepath')}: +{f.get('lines_added', 0)} / -{f.get('lines_deleted', 0)} lines, complexity: {f.get('complexity_score', 0.0)}")

        prompt = f"""
You are an expert senior software engineer and code quality analyzer.
Analyze the following commit details and generate code insights:
Commit Message: "{commit_message}"
LOC Delta: {loc_delta}
Complexity Delta: {complexity_delta}
File changes:
{"\n".join(file_details)}

Provide:
1. A concise, professional summary explaining what changed and the impact on the codebase (max 3 sentences).
2. A specific, actionable refactoring recommendation to maintain code health or clean up modified files.

You MUST respond with a JSON object containing keys: "summary" and "refactoring_recommendation".
Do not wrap it in markdown block tags, return plain JSON.
"""
        req_data = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            req_body = json.dumps(req_data).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_body,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as res:
                response = json.loads(res.read().decode("utf-8"))
                text = response["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(text.strip())
                
                # Merge with metadata computed by our rules
                return {
                    "complexity_delta": float(complexity_delta),
                    "loc_delta": int(loc_delta),
                    "risk_score": fallback_data["risk_score"],
                    "most_impacted_files": fallback_data["most_impacted_files"],
                    "summary": data.get("summary", fallback_data["summary"]),
                    "refactoring_recommendation": data.get("refactoring_recommendation", fallback_data["refactoring_recommendation"])
                }
        except Exception as e:
            # Silently fallback to mock provider if API fails
            print(f"Gemini API error, falling back to mock provider: {e}")
            return fallback_data

def get_ai_provider() -> BaseAIInsightsProvider:
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        return GeminiAIInsightsProvider(api_key)
    return MockAIInsightsProvider()
