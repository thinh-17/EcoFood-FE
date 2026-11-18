// ISO 4217 codes with readable names, like the country picker in onboarding.
const names = new Intl.DisplayNames(["en"], { type: "currency" });
export const CURRENCIES = Intl.supportedValuesOf("currency").map((code) => ({
  code, name: names.of(code),
}));
