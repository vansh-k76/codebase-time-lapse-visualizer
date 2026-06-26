import { useState } from "react";
import { useVisualizerStore } from "../../state/store";
export function AIRepositoryChat() {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const { activeRepoId } = useVisualizerStore();
    const handleAsk = async () => {
        if (!question.trim()) return;

        if (!activeRepoId) {
            setAnswer("Please select a repository first.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("http://127.0.0.1:8001/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    repository_id: activeRepoId,
                    question,
                }),
            });

            const data = await response.json();

            setAnswer(data.answer);
        } catch (error) {
            setAnswer("Failed to contact AI backend.");
            console.error(error);
        }

        setLoading(false);
    };

    return (
        <div className="bg-darkCard rounded-xl border border-darkBorder p-6 h-full flex flex-col gap-5">

            <h2 className="text-2xl font-bold mb-2">
                AI Repository Chat
            </h2>

            <p className="text-slate-400 mb-5">
                Ask questions about the selected repository. The AI answers using the repository's commits, contributors, and codebase context.
            </p>
            <textarea
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about this repository..."
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none"
            />

            <button
                onClick={handleAsk}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold"
            >
                {loading ? "Thinking..." : "Ask Repository AI"}
            </button>
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-5 h-[420px] overflow-y-auto">

                <h3 className="text-sm font-semibold text-slate-400 mb-3">
                    AI Response
                </h3>

                <div className="whitespace-pre-wrap leading-8 text-slate-200 text-[15px]">
                    {answer || "AI response will appear here."}
                </div>

            </div>
        </div>
    );
}