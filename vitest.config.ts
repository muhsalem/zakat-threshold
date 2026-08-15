import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      // منطق نقي مستخرَج من دوال Supabase الطرفية. الدوال نفسها تعمل على Deno
      // وتستورد من esm.sh فلا تُستورَد هنا، لكن ما استُخرج منها بلا استيرادات
      // يُختبر كأي وحدة أخرى — وإلا بقي مسار الدفع بلا تغطية.
      "supabase/functions/**/*.test.ts",
    ],
  },
});
