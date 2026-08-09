import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface VoiceZakatAssistantProps {
  onVoiceCommand?: (text: string) => void;
}

export function VoiceZakatAssistant({ onVoiceCommand }: VoiceZakatAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("المتصفح الحالي لا يدعم التعرف الصوتي الآلي. جرب متصفح Chrome أو Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      toast.info("تم إيقاف الاستماع الصوتي.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "ar-SA";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.success("جاري الاستماع... تحدث بمدخراتك أو استفسارك الزكوي.");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        toast.success(`تم استلام الأمر الصوتي: "${text}"`);
        if (onVoiceCommand) {
          onVoiceCommand(text);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error("تعذر التعرف على الصوت. حاول مرة أخرى.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("حدث خطأ في تشغيل المساعد الصوتي.");
    }
  };

  const speakGuide = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance("مرحباً بك في منصة نِصاب. يمكنك إدخال مدخراتك النقدية والذهب وحساب الزكاة بسهولة.");
      utterance.lang = "ar-SA";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <Card className="border-success/30 bg-card shadow-sm" dir="rtl">
      <CardHeader className="bg-success/5 border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Mic className="h-4 w-4 text-success" />
              المساعد والتوجيه الصوتي الآلي (Voice Assistant)
            </CardTitle>
            <CardDescription className="text-xs">
              تحدث بمدخراتك أو استفسارك الفقهي ليقوم النظام بإدخالها وتوجيهك آلياً.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-success border-success/40 text-[10px]">
            سهولة الاستخدام لكبار السن
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={toggleListening}
            className={`gap-2 text-xs font-bold ${
              isListening ? "bg-destructive hover:bg-destructive animate-pulse text-white" : "bg-success hover:bg-success text-white"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4" /> جاري الاستماع...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> ابدأ الإدخال الصوتي
              </>
            )}
          </Button>

          <Button size="sm" variant="outline" onClick={speakGuide} className="gap-1.5 text-xs">
            <Volume2 className="h-4 w-4 text-success" /> استمع للشرح الصوتي
          </Button>
        </div>

        {transcript && (
          <div className="text-xs p-2 rounded-lg bg-success/10 border border-success/30 text-success dark:text-success">
            <strong>النص الملتقط:</strong> "{transcript}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
