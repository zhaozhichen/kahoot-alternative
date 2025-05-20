'use client'

import { QuizSet, supabase } from '@/types/types'
import { useEffect, useState } from 'react'
import Link from "next/link";
import Papa, { ParseResult, ParseError } from 'papaparse';

const CSV_TEMPLATE = `Question,Answer 1,Answer 2,Answer 3,Answer 4,Time limit (sec),Correct answer(s)
What is the capital of France?,Paris,Lyon,Marseille,Nice,30,1
`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiz_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [quizSet, setQuizSet] = useState<QuizSet[]>([])
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    const getQuizSets = async () => {
      const { data, error } = await supabase
        .from('quiz_sets')
        .select(`*, questions(*, choices(*))`)
        .order('created_at', { ascending: false })
      if (error) {
        alert('Failed to fetch quiz sets')
        return
      }
      setQuizSet(data)
    }
    getQuizSets()
  }, [])

  const startGame = async (quizSetId: string) => {
    const { data, error } = await supabase
      .from('games')
      .insert({
        quiz_set_id: quizSetId,
      })
      .select()
      .single()
    if (error) {
      console.error(error)
      alert('Failed to start game')
      return
    }

    const gameId = data.id
    window.open(`/host/game/${gameId}`, '_blank', 'noopener,noreferrer')
  }

  const deleteQuizSet = async (quizSetId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    const { error } = await supabase
      .from('quiz_sets')
      .delete()
      .eq('id', quizSetId);
    if (error) {
      alert('Failed to delete quiz set: ' + error.message);
      return;
    }
    setQuizSet((prev) => prev.filter((q) => q.id !== quizSetId));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    setCsvPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.errors.length) {
          setCsvError('CSV Parse Error: ' + results.errors[0].message);
        } else {
          setCsvPreview(results.data as any[]);
        }
      },
      error: (err: any) => setCsvError('CSV Parse Error: ' + err.message),
    });
  };

  async function importCsvToQuiz() {
    if (!csvPreview.length) return;
    setImporting(true);
    setImportSuccess(null);
    // Prompt for quiz name
    const quizName = prompt('Enter a name for the new quiz set:', csvPreview[0]['Question']?.slice(0, 30) || 'Imported Quiz');
    if (!quizName) {
      setImporting(false);
      return;
    }
    // Create quiz set
    const { data: quizSet, error: quizSetError } = await supabase
      .from('quiz_sets')
      .insert({ name: quizName, description: 'Imported from CSV' })
      .select()
      .single();
    if (quizSetError || !quizSet) {
      setImporting(false);
      alert('Failed to create quiz set: ' + (quizSetError?.message || 'Unknown error'));
      return;
    }
    // Insert questions and choices
    for (const row of csvPreview) {
      const questionText = String(row['Question'] || '').slice(0, 120);
      const timeLimit = Number(row['Time limit (sec)']) || 30;
      const answers = [1, 2, 3, 4].map(i => String(row[`Answer ${i}`] || '').slice(0, 75));
      const correctAnswers = String(row['Correct answer(s)'] || '').split(',').map(s => s.trim()).filter(Boolean);
      // Insert question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          body: questionText,
          quiz_set_id: quizSet.id,
          order: 0, // You may want to increment this if order matters
          image_url: null,
        })
        .select()
        .single();
      if (questionError || !question) {
        alert('Failed to insert question: ' + (questionError?.message || 'Unknown error'));
        continue;
      }
      // Insert choices
      for (let i = 0; i < answers.length; i++) {
        const isCorrect = correctAnswers.includes(String(i + 1));
        const { error: choiceError } = await supabase
          .from('choices')
          .insert({
            body: answers[i],
            question_id: question.id,
            is_correct: isCorrect,
          });
        if (choiceError) {
          alert('Failed to insert answer: ' + choiceError.message);
        }
      }
    }
    setImporting(false);
    setImportSuccess('Quiz imported successfully!');
    setCsvPreview([]);
    // Refresh quiz sets
    const { data, error } = await supabase
      .from('quiz_sets')
      .select(`*, questions(*, choices(*))`)
      .order('created_at', { ascending: false });
    if (!error && data) setQuizSet(data);
  }

  return (
    <>
      <div className="mb-4 flex gap-4 items-center">
        <Link href="/host/dashboard/add-quiz">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">+ Add New Quiz</button>
        </Link>
        <button className="bg-gray-600 text-white px-4 py-2 rounded" onClick={downloadTemplate}>
          Download CSV Template
        </button>
        <label className="bg-gray-200 px-4 py-2 rounded cursor-pointer">
          Import from CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </label>
      </div>
      {quizSet.map((quizSet) => (
        <div
          key={quizSet.id}
          className="flex justify-start shadow my-4 mx-2 rounded"
        >
          <img className="h-28" src="/default.png" alt="default quiz image" />
          <div className="p-2 flex flex-col justify-between items-stretch flex-grow">
            <h2 className="font-bold">{quizSet.name}</h2>
            <div className="flex justify-between items-end">
              <div>{quizSet.questions.length} questions</div>
              <div className="flex gap-2">
                <button
                  className="bg-green-500 text-white py-1 px-4 rounded"
                  onClick={() => startGame(quizSet.id)}
                >
                  Start Game
                </button>
                <button
                  className="bg-red-500 text-white py-1 px-4 rounded"
                  onClick={() => deleteQuizSet(quizSet.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {csvError && <div className="text-red-600">{String(csvError)}</div>}
      {csvPreview.length > 0 && (
        <div className="mb-4">
          <div className="font-bold">CSV Preview:</div>
          <table className="table-auto border-collapse border border-gray-400 mt-2">
            <thead>
              <tr>
                {Object.keys(csvPreview[0]).map((col) => (
                  <th key={col} className="border border-gray-400 px-2 py-1">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvPreview.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="border border-gray-400 px-2 py-1">{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
            onClick={importCsvToQuiz}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import as New Quiz'}
          </button>
          {importSuccess && <div className="text-green-600 mt-2">{importSuccess}</div>}
        </div>
      )}
    </>
  )
}
