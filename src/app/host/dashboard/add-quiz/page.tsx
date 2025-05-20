"use client";

import { useState } from "react";
import { supabase } from "@/types/types";
import { useRouter } from "next/navigation";

export default function AddQuiz() {
  const [quizName, setQuizName] = useState("");
  const [questions, setQuestions] = useState([
    { text: "", choices: [ { text: "", isCorrect: false } ] }
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleQuestionChange = (idx: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[idx].text = value;
    setQuestions(newQuestions);
  };

  const handleChoiceChange = (qIdx: number, cIdx: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices[cIdx].text = value;
    setQuestions(newQuestions);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: "", choices: [ { text: "", isCorrect: false } ] }]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleAddChoice = (qIdx: number) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices.push({ text: "", isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleRemoveChoice = (qIdx: number, cIdx: number) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices = newQuestions[qIdx].choices.filter((_, i) => i !== cIdx);
    setQuestions(newQuestions);
  };

  const handleSetCorrect = (qIdx: number, cIdx: number) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices = newQuestions[qIdx].choices.map((choice, idx) => ({
      ...choice,
      isCorrect: idx === cIdx,
    }));
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // 1. Insert quiz_set
    const { data: quizSet, error: quizSetError } = await supabase
      .from("quiz_sets")
      .insert({ name: quizName })
      .select()
      .single();
    if (quizSetError) {
      alert("Failed to create quiz set: " + quizSetError.message);
      setLoading(false);
      return;
    }
    // 2. Insert questions
    for (const q of questions) {
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({ quiz_set_id: quizSet.id, body: q.text, order: 0 })
        .select()
        .single();
      if (questionError) {
        alert("Failed to create question: " + questionError.message);
        setLoading(false);
        return;
      }
      // 3. Insert choices
      for (const c of q.choices) {
        const { error: choiceError } = await supabase
          .from("choices")
          .insert({
            question_id: question.id,
            body: c.text,
            is_correct: c.isCorrect,
          });
        if (choiceError) {
          alert("Failed to create choice: " + choiceError.message);
          setLoading(false);
          return;
        }
      }
    }
    setLoading(false);
    alert("Quiz created!");
    router.push("/host/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Add New Quiz</h1>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-semibold">Quiz Name</label>
        <input
          className="border p-2 w-full mb-4"
          value={quizName}
          onChange={e => setQuizName(e.target.value)}
          required
        />
        <h2 className="text-xl font-semibold mb-2">Questions</h2>
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="mb-6 border p-4 rounded">
            <div className="flex items-center mb-2">
              <input
                className="border p-2 flex-1"
                placeholder={`Question ${qIdx + 1}`}
                value={q.text}
                onChange={e => handleQuestionChange(qIdx, e.target.value)}
                required
              />
              <button type="button" className="ml-2 text-red-500" onClick={() => handleRemoveQuestion(qIdx)} disabled={questions.length === 1}>Remove</button>
            </div>
            <div className="ml-4">
              <label className="block font-semibold mb-1">Choices</label>
              {q.choices.map((c, cIdx) => (
                <div key={cIdx} className="flex items-center mb-1">
                  <input
                    className="border p-1 flex-1"
                    placeholder={`Choice ${cIdx + 1}`}
                    value={c.text}
                    onChange={e => handleChoiceChange(qIdx, cIdx, e.target.value)}
                    required
                  />
                  <label className="ml-2">
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={c.isCorrect}
                      onChange={() => handleSetCorrect(qIdx, cIdx)}
                      required
                    /> Correct
                  </label>
                  <button type="button" className="ml-2 text-red-500" onClick={() => handleRemoveChoice(qIdx, cIdx)} disabled={q.choices.length === 1}>Remove</button>
                </div>
              ))}
              <button type="button" className="mt-1 text-blue-500" onClick={() => handleAddChoice(qIdx)}>+ Add Choice</button>
            </div>
          </div>
        ))}
        <button type="button" className="mb-4 text-blue-500" onClick={handleAddQuestion}>+ Add Question</button>
        <button type="submit" className="block w-full bg-green-600 text-white py-2 rounded" disabled={loading}>{loading ? "Creating..." : "Create Quiz"}</button>
      </form>
    </div>
  );
} 