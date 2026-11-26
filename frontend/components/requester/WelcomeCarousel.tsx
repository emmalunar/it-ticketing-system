"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  Button,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageIcon,
  UsersIcon,
} from "@/components/ui";

const welcomeSlideStorageKey = "it-service-desk-welcome-slide";

const welcomeSlides = [
  {
    eyebrow: "Support that moves with you",
    title: "A helpful hand, right when you need it.",
    description: "Tell us what’s slowing you down. Our team is ready to help you get back to your best work.",
    icon: MessageIcon,
  },
  {
    eyebrow: "Your team is here",
    title: "Let’s find the fix together.",
    description: "You’re not on your own. Share the details and we’ll work through the next steps with you.",
    icon: UsersIcon,
  },
  {
    eyebrow: "Clear updates, every step",
    title: "Get back to what matters.",
    description: "From your first request to the final update, we’ll keep you informed and moving forward.",
    icon: CheckCircleIcon,
  },
] as const;

export function WelcomeCarousel({ onStartRequest }: { onStartRequest: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [restored, setRestored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const slide = welcomeSlides[activeIndex];
  const Icon = slide.icon;

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const savedIndex = Number(window.sessionStorage.getItem(welcomeSlideStorageKey));
        if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < welcomeSlides.length) {
          setActiveIndex(savedIndex);
        }
      } catch (caught) {
        console.warn("Unable to restore the welcome carousel position.", caught);
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(welcomeSlideStorageKey, String(activeIndex));
    } catch (caught) {
      console.warn("Unable to save the welcome carousel position.", caught);
    }
  }, [activeIndex, restored]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let interval: number | undefined;
    const stop = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = undefined;
    };
    const start = () => {
      if (document.visibilityState === "visible" && interval === undefined) {
        interval = window.setInterval(() => {
          setActiveIndex((current) => (current + 1) % welcomeSlides.length);
        }, 6000);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [paused]);

  return (
    <section
      aria-label={`IT service desk welcome: ${slide.eyebrow}. ${slide.title}`}
      aria-roledescription="carousel"
      className="spotlight"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onFocus={() => setFocused(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="spotlight__content">
        <p className="spotlight__eyebrow">{slide.eyebrow}</p>
        <h2 aria-live="polite" className="spotlight__title">
          {slide.title}
        </h2>
        <p className="spotlight__body">{slide.description}</p>
        <div className="spotlight__actions">
          <Button
            className="btn--light"
            onClick={onStartRequest}
            trailingIcon={<ArrowRightIcon size={15} />}
            type="button"
            variant="secondary"
          >
            Start a request
          </Button>
        </div>
      </div>
      <span aria-hidden="true" className="spotlight__art">
        <span className="absolute inset-0 grid place-items-center">
          <Icon className="text-accent-ink" size={34} />
        </span>
      </span>
      <div className="spotlight__controls">
        <div
          aria-label={`Slide ${activeIndex + 1} of ${welcomeSlides.length}`}
          className="spotlight__dots"
          role="group"
        >
          {welcomeSlides.map((item, index) => (
            <button
              key={item.eyebrow}
              aria-current={activeIndex === index ? "true" : undefined}
              aria-label={`Show welcome slide ${index + 1}`}
              className="spotlight__dot"
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
        <button
          aria-label="Previous welcome slide"
          className="spotlight__nav"
          onClick={() => setActiveIndex((activeIndex + welcomeSlides.length - 1) % welcomeSlides.length)}
          type="button"
        >
          <ChevronLeftIcon size={14} />
        </button>
        <button
          aria-label="Next welcome slide"
          className="spotlight__nav"
          onClick={() => setActiveIndex((activeIndex + 1) % welcomeSlides.length)}
          type="button"
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>
    </section>
  );
}
