import Loader from "@/components/Loader";
import { contact, site, socials } from "@/data/portfolio";
import About from "@/sections/About";
import Contact from "@/sections/Contact";
import Experience from "@/sections/Experience";
import Footer from "@/sections/Footer";
import Hero from "@/sections/Hero";
import ProjectsStack from "@/sections/ProjectsStack";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  alternateName: site.alias,
  jobTitle: site.role,
  email: `mailto:${site.email}`,
  address: { "@type": "PostalAddress", addressLocality: site.location, addressCountry: "IN" },
  worksFor: { "@type": "Organization", name: "Akamai Technologies" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "GIET University, Gunupur" },
  description: `${site.description} ${contact.education}.`,
  sameAs: [socials.github.href, socials.linkedin.href],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <a href="#about" className="skip-link">
        Skip to content
      </a>

      <Loader />

      {/* Section order matters: pinned ScrollTriggers are created top to bottom. */}
      <main>
        <Hero />
        <About />
        <Experience />
        <ProjectsStack />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
