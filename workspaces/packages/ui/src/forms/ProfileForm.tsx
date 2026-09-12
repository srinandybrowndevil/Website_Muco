"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@muco/core/browser";
import { Avatar, Icon } from "../primitives";

type CroppedAvatar = { blob: Blob; preview: string };

function normalizeSocial(value: string, host: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    (hostname !== host && hostname !== `www.${host}`) ||
    url.username ||
    url.password
  ) {
    throw new Error(`Use a full https://${host}/ profile link.`);
  }
  return url.toString().replace(/\/$/, "");
}

/** Crop a selected image locally to the square used by every MUCO avatar. */
async function cropAvatar(file: File): Promise<CroppedAvatar> {
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("This image could not be opened."));
      element.src = source;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("This image has no usable pixels.");

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => (result ? resolve(result) : reject(new Error("This image could not be prepared."))), "image/webp", 0.82);
    });
    if (blob.size > 500 * 1024) throw new Error("Choose a simpler image under 5 MB.");
    const preview = URL.createObjectURL(blob);
    return { blob, preview };
  } finally {
    URL.revokeObjectURL(source);
  }
}

/**
 * The personal part of a person's record.
 *
 * Employees and interns use the name and phone controls. Customer accounts
 * also get their public social links and a square avatar uploader. The
 * optional flags keep those customer-specific controls out of the other two
 * workspaces without duplicating the update and validation logic.
 */
export function ProfileForm({
  userId,
  fullName,
  phone,
  email,
  avatarUrl,
  linkedinUrl = null,
  instagramUrl = null,
  allowSocials = false,
  allowAvatarUpload = false,
}: {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  allowSocials?: boolean;
  allowAvatarUpload?: boolean;
}) {
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [savedProfile, setSavedProfile] = useState({
    name: fullName, phone, linkedin: linkedinUrl ?? "", instagram: instagramUrl ?? "", avatar: avatarUrl,
  });
  const [name, setName] = useState(fullName);
  const [number, setNumber] = useState(phone);
  const [linkedin, setLinkedin] = useState(linkedinUrl ?? "");
  const [instagram, setInstagram] = useState(instagramUrl ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const changed =
    name.trim() !== savedProfile.name ||
    number.trim() !== savedProfile.phone ||
    (allowSocials && (linkedin.trim() !== savedProfile.linkedin || instagram.trim() !== savedProfile.instagram)) ||
    (allowAvatarUpload && (avatarBlob !== null || removeAvatar));

  async function chooseAvatar(file?: File) {
    if (!file || !allowAvatarUpload) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image under 5 MB.");
      return;
    }
    setAvatarBusy(true);
    try {
      const cropped = await cropAvatar(file);
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(cropped.preview);
      setAvatarBlob(cropped.blob);
      setRemoveAvatar(false);
      setSaved(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "This image could not be prepared.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function clearAvatar() {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarBlob(null);
    setRemoveAvatar(Boolean(savedProfile.avatar));
    setSaved(false);
  }

  function discardChanges() {
    setName(savedProfile.name);
    setNumber(savedProfile.phone);
    setLinkedin(savedProfile.linkedin);
    setInstagram(savedProfile.instagram);
    setAvatarPreview(savedProfile.avatar);
    setAvatarBlob(null);
    setRemoveAvatar(false);
    setError(null);
    setSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!changed || busy || avatarBusy) return;
    if (!name.trim()) {
      setError("Enter your full name before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);

    let cleanLinkedin: string | null = null;
    let cleanInstagram: string | null = null;
    try {
      if (allowSocials) {
        cleanLinkedin = normalizeSocial(linkedin, "linkedin.com");
        cleanInstagram = normalizeSocial(instagram, "instagram.com");
      }
    } catch (failure) {
      setBusy(false);
      setError(failure instanceof Error ? failure.message : "Check your social profile links.");
      return;
    }

    try {
      const supabase = createClient();
      if (!supabase) {
        setBusy(false);
        setError("This workspace is not connected to its database.");
        return;
      }

      let uploadedUrl: string | null | undefined;
      if (allowAvatarUpload && avatarBlob) {
        const path = `${userId}/avatar.webp`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarBlob, {
          upsert: true,
          cacheControl: "3600",
          contentType: "image/webp",
        });
        if (uploadError) {
          setBusy(false);
          setError("Your photo could not be uploaded. Check the image and try again.");
          return;
        }
        const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
        uploadedUrl = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
      } else if (allowAvatarUpload && removeAvatar) {
        const { error: removeError } = await supabase.storage.from("avatars").remove([`${userId}/avatar.webp`]);
        if (removeError) throw new Error("The photo could not be removed.");
        uploadedUrl = null;
      }

      const updates: Record<string, string | null> = {
        full_name: name.trim() || null,
        phone: number.trim() || null,
      };
      if (allowSocials) {
        updates.linkedin_url = cleanLinkedin;
        updates.instagram_url = cleanInstagram;
      }
      if (allowAvatarUpload && uploadedUrl !== undefined) updates.avatar_url = uploadedUrl;

      const { error: failure } = await supabase.from("profiles").update(updates).eq("id", userId);

      setBusy(false);
      if (failure) {
        setError(failure.message);
        return;
      }
      setSaved(true);
      setAvatarBlob(null);
      setRemoveAvatar(false);
      const nextPhoto = uploadedUrl === undefined ? savedProfile.avatar : uploadedUrl;
      const nextProfile = {
        name: name.trim(), phone: number.trim(), linkedin: cleanLinkedin ?? "", instagram: cleanInstagram ?? "", avatar: nextPhoto,
      };
      setSavedProfile(nextProfile);
      setName(nextProfile.name);
      setNumber(nextProfile.phone);
      setLinkedin(nextProfile.linkedin);
      setInstagram(nextProfile.instagram);
      setAvatarPreview(nextPhoto);
      router.refresh();
    } catch {
      setError("We couldn't save your profile. Your changes are still here. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack profile-form" onSubmit={submit} aria-busy={busy}>
      {allowAvatarUpload ? (
        <div className="profile-avatar-editor">
          <div className="cluster">
            <Avatar name={name || email} src={avatarPreview} size="lg" />
            <div className="stack-sm">
              <span className="profile-photo-title">Profile photo</span>
              <button className="btn sm" type="button" disabled={busy || avatarBusy} onClick={() => photoInput.current?.click()}>
                <Icon name="upload" size={16} />
                {avatarBusy ? "Preparing photo" : "Choose profile photo"}
              </button>
              <input
                id="profile-avatar"
                ref={photoInput}
                hidden
                aria-label="Profile photo file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || avatarBusy}
                onChange={event => { void chooseAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }}
              />
              {avatarPreview ? (
                <button className="btn quiet sm" type="button" onClick={clearAvatar} disabled={busy || avatarBusy}>
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>
          <span className="hint">Square 1:1 crop, shown as a circle. JPG, PNG or WebP up to 5 MB.</span>
        </div>
      ) : (
        <div className="cluster">
          <Avatar name={name || email} src={avatarUrl} size="lg" />
          <span className="hint">Your photo is managed by your account.</span>
        </div>
      )}

      <fieldset className="profile-section" disabled={busy}>
      <legend>Personal details</legend>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="profile-name">Full name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            maxLength={100}
            aria-describedby="profile-name-help"
            onChange={event => { setName(event.target.value); setSaved(false); }}
            autoComplete="name"
            required
          />
          <span className="hint" id="profile-name-help">The name shown to your project team.</span>
        </div>

        <div className="field">
          <label htmlFor="profile-phone">Phone</label>
          <input
            id="profile-phone"
            type="tel"
            value={number}
            maxLength={25}
            onChange={event => { setNumber(event.target.value); setSaved(false); }}
            autoComplete="tel"
            placeholder="+91"
            aria-describedby="profile-phone-help"
          />
          <span className="hint" id="profile-phone-help">Include your country code, for example +91.</span>
        </div>
      </div>
      </fieldset>

      {allowSocials ? (
        <fieldset className="profile-section" disabled={busy}>
        <legend>Social profiles <span className="hint">Optional</span></legend>
        <p className="hint profile-section-note">Add the full HTTPS links you want to share with the studio.</p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="profile-linkedin">LinkedIn profile <span className="hint">(optional)</span></label>
            <input
              id="profile-linkedin"
              type="url"
              value={linkedin}
              maxLength={300}
              onChange={event => { setLinkedin(event.target.value); setSaved(false); }}
              placeholder="https://www.linkedin.com/in/…"
              autoComplete="url"
            />
          </div>
          <div className="field">
            <label htmlFor="profile-instagram">Instagram profile <span className="hint">(optional)</span></label>
            <input
              id="profile-instagram"
              type="url"
              value={instagram}
              maxLength={300}
              onChange={event => { setInstagram(event.target.value); setSaved(false); }}
              placeholder="https://www.instagram.com/…"
              autoComplete="url"
            />
          </div>
        </div>
        </fieldset>
      ) : null}

      {error ? <p className="errortext" role="alert">{error}</p> : null}

      <div className="profile-actions" data-active={changed || busy}>
        <p className="notice" role="status" aria-live="polite">
          <Icon name={saved && !changed ? "checkCircle" : "edit"} size={14} />
          <span>{busy ? "Saving your profile…" : saved && !changed ? "Profile saved." : changed ? "You have unsaved changes." : "Your profile is up to date."}</span>
        </p>
        <div className="cluster">
        {changed ? <button className="btn quiet" type="button" disabled={busy || avatarBusy} onClick={discardChanges}>Discard changes</button> : null}
        <button className="btn primary" type="submit" disabled={busy || avatarBusy || !changed}>
          {busy ? "Saving" : "Save changes"}
        </button>
        </div>
      </div>
    </form>
  );
}
