import { supabase } from "../config/supabaseClient.js";
import { hashPassword } from "../utils/crypto.js";
import { AppError } from "../utils/errorHandler.js";

export async function listDoctors(orgId, specialtyId) {
  let query = supabase
    .from("doctors")
    .select(`
      id,
      status,
      created_at,
      specialty_id,
      room_id,
      specialties (
        id,
        name_ru,
        name_kk
      ),
      rooms (
        id,
        number,
        name
      ),
      organization_members!inner (
        id,
        organization_id,
        status,
        profiles (
          id,
          iin,
          full_name,
          email,
          phone,
          status
        )
      )
    `)
    .eq("organization_members.organization_id", orgId);

  if (specialtyId) {
    query = query.eq("specialty_id", specialtyId);
  }

  const { data: docs, error } = await query;
  if (error) {
    throw new Error(`Ошибка получения списка врачей: ${error.message}`);
  }

  // Map to a cleaner flat structure
  return docs.map((doc) => {
    const member = doc.organization_members;
    const profile = member ? member.profiles : null;
    return {
      id: doc.id,
      specialtyId: doc.specialty_id,
      specialty: doc.specialties,
      roomId: doc.room_id,
      room: doc.rooms,
      status: doc.status,
      memberId: member ? member.id : null,
      profileId: profile ? profile.id : null,
      iin: profile ? profile.iin : "",
      fullName: profile ? profile.full_name : "",
      email: profile ? profile.email : "",
      phone: profile ? profile.phone : "",
      profileStatus: profile ? profile.status : "",
    };
  });
}

export async function getDoctorById(id) {
  const { data: doc, error } = await supabase
    .from("doctors")
    .select(`
      id,
      status,
      specialty_id,
      room_id,
      specialties (id, name_ru, name_kk),
      rooms (id, number, name),
      organization_members (
        id,
        organization_id,
        profiles (
          id,
          iin,
          full_name,
          email,
          phone,
          status
        )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) {
    throw new Error("Врач не найден.");
  }

  const member = doc.organization_members;
  const profile = member ? member.profiles : null;

  return {
    id: doc.id,
    specialtyId: doc.specialty_id,
    specialty: doc.specialties,
    roomId: doc.room_id,
    room: doc.rooms,
    status: doc.status,
    organizationId: member ? member.organization_id : null,
    profileId: profile ? profile.id : null,
    iin: profile ? profile.iin : "",
    fullName: profile ? profile.full_name : "",
    email: profile ? profile.email : "",
    phone: profile ? profile.phone : "",
  };
}

export async function createDoctor(orgId, data) {
  const { iin, fullName, email, phone, password, specialtyId, roomId } = data;

  if (!iin || !fullName || !password) {
    throw new Error("ИИН, ФИО и пароль обязательны для создания профиля врача.");
  }

  // 1. Create Profile
  const passwordHash = hashPassword(password);
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .insert({
      iin,
      full_name: fullName,
      email,
      phone,
      password_hash: passwordHash,
      role: "doctor",
      status: "active",
    })
    .select("*")
    .single();

  if (profErr) {
    throw new Error(`Ошибка создания профиля врача: ${profErr.message}`);
  }

  // 2. Create Org Member
  const { data: member, error: membErr } = await supabase
    .from("organization_members")
    .insert({
      organization_id: orgId,
      profile_id: profile.id,
      role: "doctor",
      status: "active",
    })
    .select("*")
    .single();

  if (membErr) {
    // Rollback profile
    await supabase.from("profiles").delete().eq("id", profile.id);
    throw new Error(`Ошибка добавления сотрудника организации: ${membErr.message}`);
  }

  // 3. Create Doctor record
  const { data: doctor, error: docErr } = await supabase
    .from("doctors")
    .insert({
      member_id: member.id,
      specialty_id: specialtyId || null,
      room_id: roomId || null,
      status: "active",
    })
    .select("*")
    .single();

  if (docErr) {
    // Rollback member and profile
    await supabase.from("organization_members").delete().eq("id", member.id);
    await supabase.from("profiles").delete().eq("id", profile.id);
    throw new Error(`Ошибка создания записи врача: ${docErr.message}`);
  }

  return {
    id: doctor.id,
    profileId: profile.id,
    memberId: member.id,
    fullName: profile.full_name,
    email: profile.email,
  };
}

export async function updateDoctor(orgId, doctorId, data) {
  const { specialtyId, roomId, status } = data;

  // Verify doctor belongs to the organization
  const { data: doc, error: getErr } = await supabase
    .from("doctors")
    .select("id, member_id, organization_members(organization_id)")
    .eq("id", doctorId)
    .single();

  if (getErr || !doc) {
    throw new Error("Врач не найден.");
  }

  if (doc.organization_members.organization_id !== orgId) {
    throw new AppError("Врач принадлежит другой организации.", 403);
  }

  const updateFields = {};
  if (specialtyId !== undefined) updateFields.specialty_id = specialtyId;
  if (roomId !== undefined) updateFields.room_id = roomId;
  if (status !== undefined) updateFields.status = status;
  updateFields.updated_at = new Date().toISOString();

  const { data: updatedDoc, error: updateErr } = await supabase
    .from("doctors")
    .update(updateFields)
    .eq("id", doctorId)
    .select("*")
    .single();

  if (updateErr) {
    throw new Error(`Ошибка обновления врача: ${updateErr.message}`);
  }

  return updatedDoc;
}

export async function archiveDoctor(orgId, doctorId) {
  return updateDoctor(orgId, doctorId, { status: "archived" });
}
