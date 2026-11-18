import type {
  ResiduePolicySettingVersion,
  ResidueProfileVersion,
} from "@/api/residue";

export type PolicyMode = "SYSTEM_DEFAULT" | "COMPANY_OVERRIDE";
export interface PolicyChoice {
  code: string;
  source: ResidueProfileVersion | null;
  previous: ResiduePolicySettingVersion | null;
  conflict: boolean;
}

/** A policy adopts a whole profile series. Never fall back to an older/other-scope tip. */
export function policyChoices(
  rules: ResidueProfileVersion[],
  settings: ResiduePolicySettingVersion[],
  companyId: string,
  mode: PolicyMode,
): PolicyChoice[] {
  const scoped = rules.filter(
    (rule) =>
      rule.kind === "FLOW" &&
      Number(rule.schemaVersion) === 2 &&
      (mode === "SYSTEM_DEFAULT"
        ? rule.companyId == null
        : rule.companyId === companyId),
  );
  return [...new Set(scoped.map((rule) => rule.code))]
    .toSorted()
    .map((code) => {
      const series = scoped.filter((rule) => rule.code === code);
      const tips = series.filter(
        (rule) => !series.some((next) => next.supersedesId === rule.id),
      );
      const history = settings.filter(
        (setting) =>
          setting.companyId === companyId && setting.ruleCode === code,
      );
      const settingTips = history.filter(
        (setting) => !history.some((next) => next.supersedesId === setting.id),
      );
      const conflict = tips.length !== 1 || settingTips.length > 1;
      return {
        code,
        source:
          !conflict && !series.some((rule) => rule.retirement) ? tips[0] : null,
        previous: settingTips.length === 1 ? settingTips[0] : null,
        conflict,
      };
    });
}

export function choiceFingerprint(choice: PolicyChoice): string {
  return JSON.stringify([choice.source, choice.previous, choice.conflict]);
}
