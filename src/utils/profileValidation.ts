/**
 * Valida se o perfil do atleta está completo com base nas regras de negócio da ArenaComp.
 * 
 * Regras:
 * - Pelo menos 1 modalidade (no array ou no campo legado)
 * - Graduação/Faixa
 * - Equipe
 * - Gênero
 * - Data de Nascimento
 * - Categoria
 * - Peso
 * - Altura
 * - Academia
 */
export function getMissingProfileFields(profile: any): string[] {
  const missingFields: string[] = [];
  if (!profile) return ["Perfil não encontrado"];

  // REGRA CRÍTICA: Admin não precisa preencher perfil de atleta
  if (profile.role === 'admin') {
    return [];
  }

  // 1. Modalidades (Pelo menos 1 válida)
  const modalidades = profile.modalidades || profile.modalities || [];
  const hasValidModalityInList = modalidades.some((m: any) => (!!m.modality || !!m.modalidade) && String(m.modality || m.modalidade).trim() !== '');
  const hasLegacyModality = !!(profile.modality || profile.modalidade) && String(profile.modality || profile.modalidade).trim() !== '';
  if (!hasValidModalityInList && !hasLegacyModality) {
    missingFields.push("Modalidade");
  }

  // 2. Graduação (Pode estar no perfil ou em qualquer uma das modalidades da lista)
  const hasGraduationInModalities = modalidades.some((m: any) => (!!m.belt || !!m.faixa) && String(m.belt || m.faixa).trim() !== '');
  const hasLegacyGraduation = !!(profile.graduation || profile.graduacao);
  if (!hasGraduationInModalities && !hasLegacyGraduation) {
    missingFields.push("Graduação");
  }

  // 3. Equipe
  if (!(profile.team || profile.team_id || profile.equipe)) {
    missingFields.push("Equipe");
  }

  // 4. Gênero
  if (!(profile.genero || profile.gender || profile.sexo)) {
    missingFields.push("Sexo / Gênero");
  }

  // 5. Data de Nascimento
  if (!(profile.birth_date || profile.data_nascimento || profile.dataNascimento || profile.nascimento)) {
    missingFields.push("Nascimento");
  }

  // 6. Categoria
  if (!(profile.category || profile.categoria || profile.categoria_idade)) {
    missingFields.push("Categoria");
  }

  // 7. Peso (Pode ser 0, então verificamos se não é nulo/vazio)
  const weight = profile.weight || profile.peso_kg || profile.peso;
  const hasWeight = weight !== undefined && weight !== null && String(weight).trim() !== '' && parseFloat(String(weight)) > 0;
  if (!hasWeight) {
    missingFields.push("Peso");
  }

  // 8. Altura (Pode ser 0, então verificamos se não é nulo/vazio)
  const height = profile.height || profile.altura_cm || profile.altura;
  const hasHeight = height !== undefined && height !== null && String(height).trim() !== '' && parseFloat(String(height)) > 0;
  if (!hasHeight) {
    missingFields.push("Altura");
  }

  // 9. Academia
  if (!(profile.gym_name || profile.academia || profile.equipe)) {
    missingFields.push("Academia");
  }

  // 10. Foto de Perfil
  if (!(profile.profile_photo || profile.avatar_url || profile.foto)) {
    missingFields.push("Foto de Perfil");
  }

  return missingFields;
}

export function isProfileComplete(profile: any) {
  return getMissingProfileFields(profile).length === 0;
}
