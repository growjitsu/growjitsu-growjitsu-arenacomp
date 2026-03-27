export function isProfileComplete(profile: any) {
  if (!profile) return false;
  
  return (
    (profile.modalidades?.length > 0 || profile.modality) &&
    (profile.equipe || profile.team) &&
    profile.genero &&
    (profile.dataNascimento || profile.birth_date) &&
    (profile.graduacao || profile.graduation) &&
    (profile.pais || profile.country) &&
    (profile.estado || profile.state) &&
    (profile.cidade || profile.city) &&
    (profile.foto || profile.avatar_url || profile.profile_photo)
  );
}
