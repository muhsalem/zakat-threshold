import { CompanyWizard } from "./CompanyWizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Landmark } from "lucide-react";

/**
 * لوحة المؤسسة — تعتمد نفس هيكل الشركة مع تنبيه للفصل بين النشاط التجاري والخيري
 * والأوقاف والتبرعات المقيّدة.
 */
export function InstitutionWizard() {
  return (
    <div className="space-y-4">
      <Alert className="border-primary/30 bg-primary/5">
        <Landmark className="h-4 w-4" />
        <AlertDescription className="text-xs">
          لوحة المؤسسة تتبع منهج زكاة الشركات مع تنبيهات إضافية: افصل الأنشطة الخيرية عن التجارية،
          واستبعد الأوقاف والتبرعات المقيّدة من الوعاء الزكوي، واحسب الزكاة فقط على النشاط التجاري.
        </AlertDescription>
      </Alert>
      <CompanyWizard />
    </div>
  );
}
