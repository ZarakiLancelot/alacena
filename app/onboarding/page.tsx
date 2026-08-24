import { OnboardingForms } from "@/components/onboarding/OnboardingForms";

export default function OnboardingPage() {
  return (
    <>
      <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Para registrar compras necesitás pertenecer a un hogar: creá el tuyo o
        unite a uno con un código de invitación.
      </p>
      <OnboardingForms />
    </>
  );
}
