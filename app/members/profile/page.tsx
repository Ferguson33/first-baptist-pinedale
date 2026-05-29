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
    family_name: '',
    family_member_count: 1,
  });

  // Family management state
  const [family, setFamily] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthdate, setNewChildBirthdate] = useState('');
  const [savingFamily, setSavingFamily] = useState(false);

  // Load current profile data + family
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
        family_name: '',
        family_member_count: 1,
      });

      // Load family if the user is linked to one
      if (profile.family_id) {
        loadUserFamily(profile.family_id);
      }
    }
  }, [profile]);

  const loadUserFamily = async (familyId: string) => {
    const { data: fam } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (fam) {
      setFamily(fam);
      setFormData(prev => ({
        ...prev,
        family_name: fam.name || '',
        family_member_count: fam.member_count || 1,
      }));

      // Load additional family members (children etc.)
      const { data: members } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at');

      if (members) setFamilyMembers(members);
    }
  };

  // Create or update family
  const saveFamily = async () => {
    if (!user || !formData.family_name.trim()) {
      toast.error("Please enter a family name");
      return;
    }

    setSavingFamily(true);

    try {
      let familyId = family?.id;

      if (!familyId) {
        // Create new family
        const { data: newFamily, error } = await supabase
          .from('families')
          .insert({
            name: formData.family_name.trim(),
            member_count: formData.family_member_count || 1,
            primary_contact_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        familyId = newFamily.id;
        setFamily(newFamily);

        // Link the user's profile to this family
        await supabase
          .from('profiles')
          .update({ family_id: familyId })
          .eq('id', user.id);

        toast.success("Family created!");
      } else {
        // Update existing family
        const { error } = await supabase
          .from('families')
          .update({
            name: formData.family_name.trim(),
            member_count: formData.family_member_count || 1,
          })
          .eq('id', familyId);

        if (error) throw error;
        toast.success("Family updated!");
      }

      await refreshProfile();
    } catch (error: any) {
      console.error("Full family save error:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      const msg = error?.message || error?.details || "Unknown error";
      toast.error("Failed to save family: " + msg);
    } finally {
      setSavingFamily(false);
    }
  };

  // Add a child / additional family member
  const addFamilyMember = async () => {
    if (!family?.id || !newChildName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      const { data: newMember, error } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          name: newChildName.trim(),
          birthdate: newChildBirthdate || null,
          relationship: 'child',
        })
        .select()
        .single();

      if (error) throw error;

      setFamilyMembers(prev => [...prev, newMember]);
      setNewChildName('');
      setNewChildBirthdate('');

      // Update family member count
      const newCount = (family.member_count || 1) + 1;
      await supabase
        .from('families')
        .update({ member_count: newCount })
        .eq('id', family.id);

      setFamily({ ...family, member_count: newCount });
      setFormData(prev => ({ ...prev, family_member_count: newCount }));

      toast.success("Family member added!");
    } catch (error: any) {
      toast.error("Failed to add family member: " + error.message);
    }
  };

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

        {/* Family Section */}
        <div className="pt-6 border-t">
          <div className="font-semibold text-lg mb-3">Your Family</div>
          <p className="text-sm text-[var(--color-stone-light)] mb-4">
            Manage your family here. This is what will appear in the Member Directory (e.g. “The Johnson Family – 6 members”).
          </p>

          {!family ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Family Name</label>
                <input
                  type="text"
                  name="family_name"
                  value={formData.family_name || ''}
                  onChange={handleChange}
                  className="w-full border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
                  placeholder='e.g. "The Johnson Family" or "Mike & Sarah Johnson"'
                />
              </div>
              <button
                type="button"
                onClick={saveFamily}
                disabled={savingFamily || !formData.family_name.trim()}
                className="w-full bg-[var(--color-navy)] text-white py-3 rounded-2xl font-medium disabled:opacity-60"
              >
                {savingFamily ? "Creating Family..." : "Create My Family"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Family Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Family Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="family_name"
                    value={formData.family_name || ''}
                    onChange={handleChange}
                    className="flex-1 border border-[var(--color-gold)]/30 rounded-xl px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={saveFamily}
                    disabled={savingFamily}
                    className="px-6 bg-[var(--color-navy)] text-white rounded-2xl text-sm font-medium"
                  >
                    {savingFamily ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-[var(--color-stone-light)] mt-1">
                  This is how your family will appear in the directory.
                </p>
              </div>

              {/* Current Family Members */}
              <div>
                <label className="block text-sm font-medium mb-2">Family Members</label>
                <div className="bg-[var(--color-cream)] rounded-xl p-4 space-y-2 text-sm">
                  <div>• {formData.full_name} (you)</div>
                  {formData.spouse_name && <div>• {formData.spouse_name}</div>}
                  {familyMembers.map((member, index) => (
                    <div key={index}>• {member.name} {member.birthdate ? `(${member.birthdate})` : ''}</div>
                  ))}
                  {family && <div className="text-[var(--color-gold-dark)] font-medium mt-2">Total: {family.member_count} people</div>}
                </div>
              </div>

              {/* Add Child */}
              <div className="border border-[var(--color-gold)]/30 rounded-2xl p-4">
                <label className="block text-sm font-medium mb-2">Add a Child or Family Member</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="Child's name"
                    className="flex-1 border border-[var(--color-gold)]/30 rounded-xl px-4 py-2"
                  />
                  <input
                    type="date"
                    value={newChildBirthdate}
                    onChange={(e) => setNewChildBirthdate(e.target.value)}
                    className="border border-[var(--color-gold)]/30 rounded-xl px-4 py-2"
                  />
                  <button
                    type="button"
                    onClick={addFamilyMember}
                    className="px-6 bg-[var(--color-gold)] text-white rounded-2xl text-sm font-medium whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
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
