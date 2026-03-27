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

  // 1. Modalidades (Pelo menos 1 válida)
  const modalidades = profile.modalidades || [];
  const hasValidModalityInList = modalidades.some((m: any) => !!m.modality && String(m.modality).trim() !== '');
  const hasLegacyModality = !!profile.modality && String(profile.modality).trim() !== '';
  if (!hasValidModalityInList && !hasLegacyModality) {
    missingFields.push("Modalidade");
  }

  // 2. Graduação (Pode estar no perfil ou em qualquer uma das modalidades da lista)
  const hasGraduationInModalities = modalidades.some((m: any) => !!m.belt && String(m.belt).trim() !== '');
  const hasLegacyGraduation = !!(profile.graduation || profile.graduacao);
  if (!hasGraduationInModalities && !hasLegacyGraduation) {
    missingFields.push("Graduação");
  }

  // 3. Equipe
  if (!(profile.team || profile.team_id || profile.equipe)) {
    missingFields.push("Equipe");
  }

  // 4. Gênero
  if (!profile.genero) {
    missingFields.push("Sexo / Gênero");
  }

  // 5. Data de Nascimento
  if (!(profile.birth_date || profile.dataNascimento || profile.nascimento)) {
    missingFields.push("Nascimento");
  }

  // 6. Categoria
  if (!(profile.category || profile.categoria)) {
    missingFields.push("Categoria");
  }

  // 7. Peso (Pode ser 0, então verificamos se não é nulo/vazio)
  const hasWeight = profile.weight !== undefined && profile.weight !== null && String(profile.weight).trim() !== '';
  if (!hasWeight) {
    missingFields.push("Peso");
  }

  // 8. Altura (Pode ser 0, então verificamos se não é nulo/vazio)
  const hasHeight = profile.height !== undefined && profile.height !== null && String(profile.height).trim() !== '';
  if (!hasHeight) {
    missingFields.push("Altura");
  }

  // 9. Academia
  if (!(profile.gym_name || profile.academia)) {
    missingFields.push("Academia");
  }

  return missingFields;
}

export function isProfileComplete(profile: any) {
  return getMissingProfileFields(profile).length === 0;
}
