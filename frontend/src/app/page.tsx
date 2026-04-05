import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import FeatureJudge from "@/components/landing/FeatureJudge";
import FeatureVenue from "@/components/landing/FeatureVenue";
import FeatureSearch from "@/components/landing/FeatureSearch";
import FeatureRegulation from "@/components/landing/FeatureRegulation";
import CTASection from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <FeatureJudge />
      <FeatureVenue />
      <FeatureSearch />
      <FeatureRegulation />
      <CTASection />
    </>
  );
}
