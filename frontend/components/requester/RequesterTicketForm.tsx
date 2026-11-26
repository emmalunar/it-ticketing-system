"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  IconButton,
  ImageIcon,
  MessageIcon,
  SelectField,
  TextareaField,
  XIcon,
} from "@/components/ui";
import { createTicket, uploadTicketAttachment, type TicketOptions, type UserTicket } from "@/lib/api";

const maxTicketImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/png", "image/jpeg", "image/svg+xml"];

type TicketImage = {
  id: string;
  file: File;
  preview: string;
};

type RequesterTicketFormProps = {
  open: boolean;
  options: TicketOptions | null;
  onClose: () => void;
  onSubmitted: (ticket: UserTicket) => void;
  onError: (message: string | null) => void;
};

export function RequesterTicketForm({
  open,
  options,
  onClose,
  onSubmitted,
  onError,
}: RequesterTicketFormProps) {
  const [station, setStation] = useState("");
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");
  const [ticketImages, setTicketImages] = useState<TicketImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ticketImageUrls = useRef<string[]>([]);
  const titleId = useId();
  const fileInputId = useId();
  const imageHintId = useId();
  const imageRequirementsId = useId();

  const selectedIssue = options?.problem_types.find((item) => item.id === problemType);
  const configurationUnavailable = Boolean(options) && (!options?.stations.length || !options?.problem_types.length);

  useEffect(() => () => {
    ticketImageUrls.current.forEach((url) => URL.revokeObjectURL(url));
    ticketImageUrls.current = [];
  }, []);

  function addTicketImages(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    const invalidType = selectedFiles.find((file) => !allowedImageTypes.includes(file.type));
    const oversized = selectedFiles.find((file) => file.size > maxTicketImageSize);
    if (invalidType) {
      setImageError("Use PNG, JPEG, or SVG images. Other file types aren’t supported.");
      return;
    }
    if (oversized) {
      setImageError("Each image must be 5 MB or smaller.");
      return;
    }
    setImageError(null);
    for (const file of selectedFiles) {
      const preview = URL.createObjectURL(file);
      ticketImageUrls.current.push(preview);
      setTicketImages((current) => [
        ...current,
        {
          id: `${file.name}-${crypto.randomUUID()}`,
          file,
          preview,
        },
      ]);
    }
  }

  function removeTicketImage(imageId: string) {
    const removed = ticketImages.find((image) => image.id === imageId);
    if (removed) {
      URL.revokeObjectURL(removed.preview);
      ticketImageUrls.current = ticketImageUrls.current.filter((url) => url !== removed.preview);
    }
    setTicketImages((current) => current.filter((image) => image.id !== imageId));
  }

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    onError(null);
    try {
      const ticket = await createTicket({ station, problem_type: problemType, description });
      setDescription("");
      setStation("");
      setProblemType("");
      onClose();

      const failedImages: string[] = [];
      for (const image of ticketImages) {
        try {
          await uploadTicketAttachment(ticket.id, image.file);
        } catch (caught) {
          const reason = caught instanceof Error ? caught.message : "upload failed";
          failedImages.push(`${image.file.name}: ${reason}`);
        }
      }
      ticketImageUrls.current.forEach((url) => URL.revokeObjectURL(url));
      ticketImageUrls.current = [];
      setTicketImages([]);
      setImageError(null);
      onSubmitted(ticket);
      if (failedImages.length) {
        onError(
          `Ticket ${ticket.ticket_number} was created, but ${failedImages.length} image${
            failedImages.length === 1 ? "" : "s"
          } could not be attached: ${failedImages.join("; ")}`,
        );
      }
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to submit your ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    addTicketImages(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  return (
    <form
      aria-busy={submitting || undefined}
      aria-labelledby={titleId}
      className="scroll-destination"
      hidden={!open}
      id="requester-ticket-form"
      onSubmit={submitTicket}
    >
      <Card>
        <CardHeader
          actions={
            <Button
              leadingIcon={<XIcon size={14} />}
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              Close
            </Button>
          }
        >
          <div className="card__title-group">
            <span className="card__icon">
              <MessageIcon size={17} />
            </span>
            <div className="card__heading">
              <p className="eyebrow">Get support</p>
              <h2 className="section-heading" id={titleId}>
                Tell us what you need help with
              </h2>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="form-grid form-grid--2">
            <SelectField
              label="Support location"
              onChange={(event) => setStation(event.target.value)}
              required
              value={station}
            >
              <option value="">Choose a location</option>
              {options?.stations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              hint={selectedIssue?.description || undefined}
              label="Issue type"
              onChange={(event) => setProblemType(event.target.value)}
              required
              value={problemType}
            >
              <option value="">Choose an issue type</option>
              {options?.problem_types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.category} · {item.name}
                </option>
              ))}
            </SelectField>
            <TextareaField
              containerClassName="form-grid__full"
              label="Describe the issue"
              minLength={5}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What happened, and what were you trying to do?"
              required
              rows={4}
              value={description}
            />
            <div className="field form-grid__full">
              <span className="field__label">
                Images
                <span className="field__optional">Optional</span>
              </span>
              <label
                className="file-drop cursor-pointer focus-within:border-brand-ring focus-within:bg-brand-soft"
                htmlFor={fileInputId}
              >
                <ImageIcon className="text-brand-strong" size={18} />
                <span className="file-drop__action">Add images</span>
                <span className="file-drop__meta" id={imageRequirementsId}>
                  PNG, JPEG, or SVG · up to 5 MB each
                </span>
                <input
                  accept="image/png,image/jpeg,image/svg+xml"
                  aria-describedby={`${imageRequirementsId} ${imageHintId}`}
                  aria-label="Choose images to attach to request"
                  id={fileInputId}
                  multiple
                  onChange={handleImageSelection}
                  type="file"
                />
              </label>
              <p className="field__hint" id={imageHintId}>
                Screenshots or photos help the team understand the issue.
              </p>
              {ticketImages.length > 0 ? (
                <div className="attachment-preview-grid">
                  {ticketImages.map((image) => (
                    <div className="attachment-preview-card" key={image.id}>
                      <div className="relative h-24 overflow-hidden">
                        <Image
                          alt={image.file.name}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 45vw, 160px"
                          src={image.preview}
                          unoptimized
                        />
                      </div>
                      <div className="attachment-preview-card__footer">
                        <span className="attachment-preview-card__name" title={image.file.name}>
                          {image.file.name}
                        </span>
                        <IconButton
                          label={`Remove ${image.file.name}`}
                          onClick={() => removeTicketImage(image.id)}
                          tone="danger"
                          type="button"
                        >
                          <XIcon size={13} />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {imageError ? (
                <p className="field__error" role="alert">
                  {imageError}
                </p>
              ) : null}
              <p className="text-meta">
                {ticketImages.length
                  ? `${ticketImages.length} image${ticketImages.length === 1 ? "" : "s"} will be attached to this request.`
                  : "Selected images will be uploaded with your request."}
              </p>
            </div>
          </div>
          <div className="form-actions mt-4">
            <Button
              disabled={!options?.stations.length || !options.problem_types.length}
              loading={submitting}
              type="submit"
              variant="primary"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
          {configurationUnavailable ? (
            <Alert className="mt-3" tone="warning">
              Ticket submission is unavailable because no active locations or issue types are configured.
            </Alert>
          ) : null}
        </CardBody>
      </Card>
    </form>
  );
}
