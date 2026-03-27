export function isProfileComplete(profile: any) {
  if (!profile) return false;
  
  // Mandatory fields as per user request:
  // 1. Modalities (min 1)
  // 2. Graduation
  // 3. Team
  // 4. Gender
  // 5. Birthdate
  // 6. Category
  // 7. Weight
  // 8. Height
  // 9. Gym (Academia)
  
  const hasModalities = (profile.modalidades && profile.modalidades.length > 0) || profile.modality;
  const hasTeam = profile.team || profile.team_id;
  const hasGender = profile.genero;
  const hasBirthDate = profile.birth_date || profile.dataNascimento;
  const hasGraduation = profile.graduation || profile.graduacao;
  const hasCategory = profile.category || profile.categoria;
  const hasWeight = profile.weight !== undefined && profile.weight !== null && profile.weight !== '';
  const hasHeight = profile.height !== undefined && profile.height !== null && profile.height !== '';
  const hasGym = profile.gym_name || profile.academia;

  return !!(
    hasModalities &&
    hasTeam &&
    hasGender &&
    hasBirthDate &&
    hasGraduation &&
    hasCategory &&
    hasWeight &&
    hasHeight &&
    hasGym
  );
}
