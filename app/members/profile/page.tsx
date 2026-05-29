"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function MemberProfilePage() {
  const { user, profile, refreshProfile, isApprovedMember } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent the whole page from navigating when someone drops a file anywhere
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    spouse_name: '',
    birthdate: '',
    anniversary: '',
    spouse_birthdate: '',
    notes: '',
    photo_url: '',
  });

  // Load current profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        spouse_name: profile.spouse_name || '',
        birthdate: profile.birthdate || '',
        anniversary: profile.anniversary || '',
        spouse_birthdate: profile.spouse_birthdate || '',
        notes: profile.notes || '',
        photo_url: profile.photo_url || '',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle photo upload to Supabase Storage
  const uploadPhoto = async (file: File) => {
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('member-photos')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update form with new photo URL
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));

      toast.success("Photo uploaded! Don't forget to save your profile.");
    } catch (error: any) {
      console.error("Photo upload error:", error);
      const errorMessage = error?.message || error?.error?.message || "Unknown error";
      toast.error(`Failed to upload photo: ${errorMessage}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          address: formData.address || null,
          spouse_name: formData.spouse_name || null,
          birthdate: formData.birthdate || null,
          anniversary: formData.anniversary || null,
          spouse_birthdate: formData.spouse_birthdate || null,
          notes: formData.notes || null,
          photo_url: formData.photo_url || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Photo upload handlers
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p>Please sign in to access your profile.</p>
        <Link href="/login" className="mt-4 inline-block underline">Sign In</Link>
      </div>
    );
  }

  const isPending = profile?.role === 'pending';

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/members" className="text-sm text-[var(--color-gold-dark)] hover:underline">← Back to Members Portal</Link>
        <h1 className="text-4xl font-semibold tracking-tight mt-2">My Member Profile</h1>
        <p className="text-[var(--color-stone)] mt-1">This information helps us know you better as part of our church family.</p>

        {isPending && (
          <div className="mt-4 bg-[var(--color-cream)] border border-[var(--color-gold)]/40 rounded-2xl p-4 text-sm">
            Thank you for signing up! Your membership request is currently with the pastors for approval. 
            You’re welcome to complete your profile now — this information will be visible to the church family once you’re approved.
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8 bg-white border rounded-3xl p-8">
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Profile Photo</label>
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="flex-shrink-0">
              {formData.photo_url ? (
                <img 
                  src={formData.photo_url} 
                  alt="Your photo" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--color-gold)]/30" 
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--color-cream)] flex items-center justify-center text-[var(--color-stone-light)] text-sm border border-dashed border-[var(--color-gold)]/40">
                  No photo
                </div>
              )}
            </div>

            {/* Upload Dropzone */}
            <div className="flex-1">
              <div
                onClick={triggerFileInput}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-[var(--color-gold)] bg-[var(--color-cream)]' 
                    : 'border-[var(--color-gold)]/40 hover:border-[var(--color-gold)]/70'
                }`}
              >
                <div className="text-sm text-[var(--color-stone)]">
                  {uploadingPhoto ? (
                    "Uploading photo..."
                  ) : (
                    <>
                      <span className="font-medium text-[var(--color-gold-dark)]">Click to choose</span> or drag and drop
                      <br />
                      <span className="text-xs text-[var(--color-stone-light)]">JPG or PNG • Max 5MB</span>
                    </>
                  )}
                </div>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoInputChange} 
                disabled={uploadingPhoto}
                className="hidden"
              />

              {uploadingPhoto && (
                <p className="text-xs text-[var(--color-gold-dark)] mt-2 text-center">Uploading...</p>
              )}
            </div>
          </div>
          <p className="text-[10px] text-[var(--color-stone-light)] mt-2">
            Note: You may need to ask a pastor to create the "member-photos" storage bucket if uploads fail.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Spouse Name (if married)</label>
            <input
              type="text"
              name="spouse_name"
              value={formData.spouse_name}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Birthdate</label>
            <input
              type="text"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              placeholder="MM/DD/YYYY or YYYY-MM-DD"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Anniversary (if married)</label>
            <input
              type="text"
              name="anniversary"
              value={formData.anniversary}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              placeholder="MM/DD/YYYY or YYYY-MM-DD (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Spouse’s Birthdate (if married)</label>
            <input
              type="text"
              name="spouse_birthdate"
              value={formData.spouse_birthdate}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              placeholder="MM/DD/YYYY or YYYY-MM-DD (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              placeholder="(307) 555-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Mailing Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notes / Prayer Requests (optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
            placeholder="Anything the pastors or church family should know..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--color-navy)] hover:bg-black text-white py-4 rounded-2xl font-medium transition disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save My Profile"}
        </button>

        <p className="text-center text-xs text-[var(--color-stone-light)]">
          This information is only visible to approved members and pastors.
        </p>
      </form>
    </div>
  );
}
