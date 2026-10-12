"use client";

import { useEffect, useRef } from "react";
import Magnetic from "@/components/Magnetic";
import { site } from "@/data/portfolio";
import { scrollToY } from "@/lib/scroll";

export default function Footer() {
  const clock = useRef<HTMLTimeElement>(null);

  // Live local time. Written straight to the DOM: no re-render every second,
  // and nothing time-dependent in the server-rendered HTML.
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone: site.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => {
      if (!clock.current) return;
      const now = new Date();
      clock.current.textContent = format.format(now);
      clock.current.dateTime = now.toISOString();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="footer shell">
      <p className="footer-clock">
        <span className="label">{site.location}</span>
        <time ref={clock} suppressHydrationWarning>
          --:--:--
        </time>
        <span className="label">IST</span>
      </p>
      <p>{site.copyright}</p>
      <p>{site.builtWith}</p>
      <Magnetic className="btn" onClick={() => scrollToY(0)}>
        back to top ↑
      </Magnetic>
    </footer>
  );
}
