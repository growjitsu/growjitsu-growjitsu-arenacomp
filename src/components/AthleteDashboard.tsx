import { useState, useEffect } from 'react';
import { User, Trophy, Calendar, MapPin, Scale, Award, Camera, Edit3, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { getAutomaticCategorization } from '../services/categorization';
import { AthleteProfile, Gender, Belt } from '../types';

export default function AthleteDashboard() {
  // Mock data for demo
  const [profile, setProfile] = useState<AthleteProfile>({
    id: '1',
    user_id: 'u1',
    gender: 'Masculino',
    birth_date: '2008-12-31',
    belt: 'Azul',
    weight: 74.5,
    age_category: '',
    weight_category: ''
  });

  const [stats, setStats] = useState({
    competitiveAge: 0,
    ageCategory: '',
    weightCategory: '',
    fullCategory: ''
  });

  useEffect(() => {
    const result = getAutomaticCategorization(profile.birth_date, profile.gender, profile.weight);
    setStats(result);
  }, [profile]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Card */}
        <div className="w-full md:w-80 space-y-6">
          <div className="card-surface p-6 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-bjj-blue p-1 mb-4">
                <img 
                  src="https://picsum.photos/seed/athlete/200/200" 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button className="absolute bottom-4 right-0 p-2 bg-bjj-blue text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
            <h2 className="text-2xl font-black font-display">Ricardo Almeida</h2>
            <p className="text-bjj-blue font-bold uppercase text-xs tracking-widest mt-1">Atleta Competidor</p>
            
            <div className="w-full h-[1px] bg-[var(--border-ui)] my-6" />
            
            <div className="w-full space-y-4 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Faixa</span>
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded uppercase">Azul</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Peso</span>
                <span className="font-bold text-[var(--text-main)]">{profile.weight} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">Nascimento</span>
                <span className="font-bold text-[var(--text-main)]">31/12/2008</span>
              </div>
            </div>

            <button className="btn-outline w-full mt-8 text-sm">
              <Edit3 size={16} />
              Editar Perfil
            </button>
          </div>

          <div className="card-surface p-6 bg-bjj-blue text-white">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Award size={20} />
              Minha Categoria
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs opacity-70 font-bold uppercase">Idade Competitiva</p>
                <p className="text-2xl font-black">{stats.competitiveAge} Anos</p>
              </div>
              <div>
                <p className="text-xs opacity-70 font-bold uppercase">Divisão</p>
                <p className="text-xl font-bold">{stats.ageCategory}</p>
              </div>
              <div>
                <p className="text-xs opacity-70 font-bold uppercase">Peso</p>
                <p className="text-xl font-bold">{stats.weightCategory}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black font-display tracking-tight text-[var(--text-main)]">Campeonatos Disponíveis</h2>
          </div>

          <div className="grid gap-6">
            <ChampionshipCard 
              name="Open Jiu-Jitsu Pro 2026" 
              date="15 Março 2026" 
              location="Ginásio do Ibirapuera, SP"
              status="Inscrições Abertas"
            />
            <ChampionshipCard 
              name="Copa ArenaComp Verão" 
              date="22 Abril 2026" 
              location="Arena Carioca, RJ"
              status="Inscrições Abertas"
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold font-display text-[var(--text-main)]">Minhas Inscrições</h3>
            <div className="card-surface p-6 flex items-center justify-between border-l-4 border-emerald-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-main)]">Seletiva Regional Sul</h4>
                  <p className="text-xs text-[var(--text-muted)]">Inscrição Confirmada • {stats.fullCategory}</p>
                </div>
              </div>
              <button className="text-bjj-blue font-bold text-sm hover:underline">Ver Comprovante</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChampionshipCard({ name, date, location, status }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="card-surface p-6 flex flex-col md:flex-row justify-between items-center gap-6 group"
    >
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--border-ui)] flex items-center justify-center text-bjj-blue group-hover:bg-bjj-blue group-hover:text-white transition-colors">
          <Trophy size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black font-display text-[var(--text-main)]">{name}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><Calendar size={16} /> {date}</span>
            <span className="flex items-center gap-1"><MapPin size={16} /> {location}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-full tracking-widest">
          {status}
        </span>
        <button className="btn-primary py-2 px-8 text-sm">Inscrever-se</button>
      </div>
    </motion.div>
  );
}
