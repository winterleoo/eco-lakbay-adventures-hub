import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Type Definitions ---
interface Question {
  questionText: string;
  options: string[];
}
interface Result {
  isCorrect: boolean;
  correctAnswerIndex: number;
}
type QuizStage = "topic_selection" | "in_progress" | "results";

export default function QuizSection() {
  const [stage, setStage] = useState<QuizStage>("topic_selection");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [results, setResults] = useState<{ score: number; results: Result[] } | null>(null);
  const { toast } = useToast();

  // --- Predefined topics for dropdown ---
  const topics = [
    "Sustainable Tourism",
    "Eco-Friendly Accommodations",
    "Renewable Energy in Tourism",
    "Waste Management Practices",
    "Biodiversity Conservation",
    "Cultural Heritage Preservation",
    "Community-Based Tourism",
    "Carbon Footprint Reduction",
    "Green Transportation",
    "Responsible Travel Behavior",
  ];

  const handleStartQuiz = async () => {
    if (!topic.trim()) {
      toast({ title: "Please select a topic.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-quiz-handler", {
        body: { action: "generate", topic },
      });
      if (error) throw error;
      setQuizId(data.quizId);
      setQuestions(data.questions);
      setUserAnswers(new Array(data.questions.length).fill(null));
      setStage("in_progress");
    } catch (err: any) {
      toast({ title: "Failed to generate quiz", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    setUserAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  };

  const handleSubmitQuiz = async () => {
    if (userAnswers.some((answer) => answer === null)) {
      toast({ title: "Please answer all questions.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-quiz-handler", {
        body: { action: "grade", quizId, userAnswers },
      });
      if (error) throw error;
      setResults(data);
      setStage("results");
    } catch (err: any) {
      toast({ title: "Failed to submit quiz", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAgain = () => {
    setStage("topic_selection");
    setTopic("");
    setQuestions([]);
    setUserAnswers([]);
    setResults(null);
    setQuizId(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      );
    }

    switch (stage) {
      case "topic_selection":
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <h3 className="text-xl font-semibold">Choose your quiz topic</h3>
            <div className="flex flex-col w-full max-w-sm items-center space-y-4">
              <Select onValueChange={(value) => setTopic(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t, index) => (
                    <SelectItem key={index} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleStartQuiz} className="w-full">
                Start Quiz
              </Button>
            </div>
          </div>
        );

      case "in_progress":
        return (
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex}>
                <p className="font-semibold mb-2">
                  {qIndex + 1}. {q.questionText}
                </p>
                <RadioGroup onValueChange={(value) => handleAnswerChange(qIndex, parseInt(value))}>
                  {q.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(oIndex)} id={`q${qIndex}o${oIndex}`} />
                      <Label htmlFor={`q${qIndex}o${oIndex}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            <Button onClick={handleSubmitQuiz} className="w-full">
              Submit
            </Button>
          </div>
        );

      case "results":
        return (
          <div className="text-center p-4">
            <h3 className="text-2xl font-bold">Quiz Complete!</h3>
            <p className="text-4xl my-4 font-bold">
              {results?.score} / {questions.length}
            </p>
            <div className="text-left space-y-4 my-6">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md ${
                    results?.results[index].isCorrect
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-red-100 dark:bg-red-900"
                  }`}
                >
                  <p className="font-semibold">
                    {index + 1}. {q.questionText}
                  </p>
                  <p
                    className={`text-sm ${
                      results?.results[index].isCorrect
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    Your answer: {q.options[userAnswers[index]!]}{" "}
                    {results?.results[index].isCorrect ? " (Correct)" : " (Incorrect)"}
                  </p>
                  {!results?.results[index].isCorrect && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Correct answer: {q.options[results?.results[index].correctAnswerIndex!]}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handlePlayAgain}>Play Again</Button>
          </div>
        );
    }
  };

  return (
    <section id="quiz" className="max-w-4xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Eco Quiz</CardTitle>
          <CardDescription>
            Test your knowledge on eco-friendly tourism and sustainability topics!
          </CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </section>
  );
}
