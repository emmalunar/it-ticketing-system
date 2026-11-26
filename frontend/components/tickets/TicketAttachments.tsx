"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { downloadTicketAttachment, getTicketAttachments, type TicketAttachment } from "@/lib/api";
import { cn } from "@/lib/cn";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import {
  formatDate,
  formatFileSize,
  isImageAttachment,
} from "@/lib/ticket-meta";
import { Alert, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { IconButton } from "@/components/ui/Button";
import {
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  ImageIcon,
  PaperclipIcon,
  XIcon,
} from "@/components/ui/icons";

type LoadedAttachment = {
  attachment: TicketAttachment;
  preview: string | null;
};

export function TicketAttachments({
  ticketId,
  title = "Attachments",
  className,
}: {
  ticketId: string;
  title?: string;
  className?: string;
}) {
  const [items, setItems] = useState<LoadedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [preview, setPreview] = useState<LoadedAttachment | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    void (async () => {
      try {
        const attachments = await getTicketAttachments(ticketId);
        const loaded = await Promise.all(
          attachments.map(async (attachment) => {
            if (!isImageAttachment(attachment)) return { attachment, preview: null };
            try {
              const blob = await downloadTicketAttachment(attachment.id);
              if (cancelled) return { attachment, preview: null };
              const url = URL.createObjectURL(blob);
              objectUrls.push(url);
              return { attachment, preview: url };
            } catch {
              return { attachment, preview: null };
            }
          }),
        );
        if (!cancelled) setItems(loaded);
      } catch (caught) {
        if (!cancelled) {
          setItems([]);
          setError(caught instanceof Error ? caught.message : "Unable to load ticket attachments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [ticketId, reloadToken]);

  useEffect(() => {
    if (!preview) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const focusTimer = window.setTimeout(() => lightboxCloseRef.current?.focus(), 30);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreview(null);
        return;
      }
      if (event.key !== "Tab") return;
      const root = lightboxRef.current;
      if (!root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>("button:not([disabled])")).filter(
        (element) => element.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockBodyScroll();
      previousFocus?.focus();
    };
  }, [preview]);

  async function handleDownload(attachment: TicketAttachment) {
    setDownloadingId(attachment.id);
    setActionError(null);
    try {
      const blob = await downloadTicketAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.file_name;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to download this attachment.");
    } finally {
      setDownloadingId(null);
    }
  }

  function closeLightbox() {
    setPreview(null);
  }

  const imageItems = items.filter((item) => item.preview);
  const fileItems = items.filter((item) => !item.preview);
  const lightbox =
    preview && preview.preview && typeof document !== "undefined"
      ? createPortal(
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${preview.attachment.file_name}`}
            ref={lightboxRef}
            onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
              if (event.target === event.currentTarget) closeLightbox();
            }}
          >
            <div className="lightbox__toolbar">
              <p className="lightbox__title">{preview.attachment.file_name}</p>
              <div className="lightbox__actions">
                <button
                  className="lightbox__button"
                  type="button"
                  aria-label="Download attachment"
                  title="Download attachment"
                  onClick={() => void handleDownload(preview.attachment)}
                  disabled={downloadingId === preview.attachment.id}
                >
                  <DownloadIcon size={16} />
                </button>
                <button
                  className="lightbox__button"
                  ref={lightboxCloseRef}
                  type="button"
                  aria-label="Close image preview"
                  title="Close preview"
                  onClick={closeLightbox}
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>
            <div
              className="lightbox__stage"
              onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
                if (event.target === event.currentTarget) closeLightbox();
              }}
            >
              <Image
                src={preview.preview}
                alt={preview.attachment.file_name}
                className="lightbox__image"
                width={1600}
                height={1200}
                unoptimized
              />
            </div>
            <p className="lightbox__caption">
              {preview.attachment.file_name} · {formatFileSize(preview.attachment.file_size)}
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className={cn("stack stack--sm", className)} aria-label={title}>
      <div className="band">
        <p className="band__title">
          <PaperclipIcon size={14} />
          {title}
          {!loading && !error ? <span className="count-pill">{items.length}</span> : null}
        </p>
        {!loading && !error && items.length ? (
          <span className="band__meta">Shared by the requester</span>
        ) : null}
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      {loading ? (
        <div className="attachment-preview-grid" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} style={{ height: 124, borderRadius: 10 }} />
          ))}
        </div>
      ) : error ? (
        <Alert
          tone="error"
          title="Attachments could not be loaded"
          action={
            <button
              className="link-action"
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setReloadToken((value) => value + 1);
              }}
            >
              Try again
            </button>
          }
        >
          {error}
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState
          compact
          inline
          icon={<PaperclipIcon size={18} />}
          title="No attachments"
          body="No files were included with this request."
        />
      ) : (
        <div className="stack">
          {imageItems.length ? (
            <div className="attachment-preview-grid">
              {imageItems.map(({ attachment, preview: previewUrl }) => (
                <div className="attachment-preview-card" key={attachment.id}>
                  <button
                    className="attachment-preview-card__image"
                    type="button"
                    onClick={() => setPreview({ attachment, preview: previewUrl })}
                    aria-label={`Preview ${attachment.file_name}`}
                  >
                    <Image
                      src={previewUrl as string}
                      alt={attachment.file_name}
                      width={640}
                      height={400}
                      unoptimized
                    />
                    <span className="attachment-preview-card__overlay">
                      <EyeIcon size={14} /> Preview
                    </span>
                  </button>
                  <div className="attachment-preview-card__footer">
                    <span className="attachment-preview-card__name" title={attachment.file_name}>
                      {attachment.file_name}
                    </span>
                    <IconButton
                      label={`Download ${attachment.file_name}`}
                      onClick={() => void handleDownload(attachment)}
                      disabled={downloadingId === attachment.id}
                    >
                      <DownloadIcon size={14} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {fileItems.length ? (
            <div className="attachment-list">
              {fileItems.map(({ attachment }) => (
                <div className="attachment-item" key={attachment.id}>
                  <span className="attachment-item__thumb">
                    {attachment.content_type.startsWith("image/") ? (
                      <ImageIcon size={17} />
                    ) : (
                      <FileTextIcon size={17} />
                    )}
                  </span>
                  <span className="attachment-item__meta">
                    <span className="attachment-item__name" title={attachment.file_name}>
                      {attachment.file_name}
                    </span>
                    <span className="attachment-item__sub">
                      {formatFileSize(attachment.file_size)} · Added {formatDate(attachment.created_at)}
                    </span>
                  </span>
                  <span className="attachment-item__actions">
                    <IconButton
                      label={`Download ${attachment.file_name}`}
                      onClick={() => void handleDownload(attachment)}
                      disabled={downloadingId === attachment.id}
                    >
                      <DownloadIcon size={15} />
                    </IconButton>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {lightbox}
    </section>
  );
}
