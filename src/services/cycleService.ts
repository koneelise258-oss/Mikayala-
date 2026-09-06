import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CycleData, CycleHistoryItem, CyclePhase, DailySymptomLog, MenstrualPrediction } from '../types';

const STORAGE_KEY = 'mikayla_cycle_data';
const HISTORY_STORAGE_KEY = 'mikayla_cycle_history';

/**
 * Calcul mathématique et gynécologique intelligent du cycle menstruel (méthode de calendrier avancée style Flo)
 */
export class CycleService {
  /**
   * Calcule la durée moyenne adaptative à partir de l'historique des cycles réels (au-delà de 3 cycles)
   */
  public calculateAdaptiveCycleLength(history: CycleHistoryItem[] = [], defaultLength: number = 28): { averageLength: number; isIrregular: boolean } {
    if (!history || history.length < 3) {
      return { averageLength: defaultLength, isIrregular: false };
    }

    const validCycles = history.filter(c => c.cycleLength >= 20 && c.cycleLength <= 45);
    if (validCycles.length < 2) {
      return { averageLength: defaultLength, isIrregular: false };
    }

    const sum = validCycles.reduce((acc, c) => acc + c.cycleLength, 0);
    const averageLength = Math.round(sum / validCycles.length);

    // Détection d'irrégularité (écart type > 5 jours)
    const variance = validCycles.reduce((acc, c) => acc + Math.pow(c.cycleLength - averageLength, 2), 0) / validCycles.length;
    const stdDev = Math.sqrt(variance);
    const isIrregular = stdDev > 4.5;

    console.log(`[Cycle] Adaptation historique : moyenne=${averageLength}j, écart-type=${stdDev.toFixed(1)}j, irrégulier=${isIrregular}`);
    return { averageLength, isIrregular };
  }

  /**
   * Calcule toutes les métriques et prédictions automatiques du cycle en cours
   */
  public calculatePredictions(
    lastPeriodStartDate: string,
    cycleLength: number = 28,
    periodLength: number = 5,
    history: CycleHistoryItem[] = []
  ): MenstrualPrediction {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(lastPeriodStartDate);
    startDate.setHours(0, 0, 0, 0);

    // Si la date est invalide, fallback
    const validStartDate = isNaN(startDate.getTime()) ? new Date() : startDate;
    validStartDate.setHours(0, 0, 0, 0);

    // Adaptation automatique si historique disponible
    const { averageLength } = this.calculateAdaptiveCycleLength(history, cycleLength);
    const effectiveCycleLength = averageLength || cycleLength || 28;
    const effectivePeriodLength = periodLength || 5;

    // Différence en jours depuis le début du cycle
    const diffTime = today.getTime() - validStartDate.getTime();
    const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentCycleDay = daysSinceStart >= 0 ? (daysSinceStart % effectiveCycleLength) + 1 : 1;

    // Prochaines règles : Date Début = DateDébutActuelle + cycleLength
    const nextPeriodStart = new Date(validStartDate);
    const cyclesElapsed = Math.max(1, Math.floor(daysSinceStart / effectiveCycleLength) + 1);
    nextPeriodStart.setDate(validStartDate.getDate() + cyclesElapsed * effectiveCycleLength);

    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setDate(nextPeriodStart.getDate() + effectivePeriodLength - 1);

    // Ovulation estimée = Prochaines règles - 14 jours (constante phase lutéale standard de 14j)
    const ovulationDate = new Date(nextPeriodStart);
    ovulationDate.setDate(nextPeriodStart.getDate() - 14);

    // Fenêtre fertile = Ovulation - 5 jours à Ovulation + 1 jour (survie spermatozoïdes 5j + ovocyte 24h)
    const fertileWindowStart = new Date(ovulationDate);
    fertileWindowStart.setDate(ovulationDate.getDate() - 5);

    const fertileWindowEnd = new Date(ovulationDate);
    fertileWindowEnd.setDate(ovulationDate.getDate() + 1);

    // Détermination de la phase actuelle
    let currentPhase: CyclePhase = 'folliculaire';
    let conceptionChance: 'faible' | 'moyenne' | 'haute' | 'très haute' = 'faible';

    const isPeriodToday = currentCycleDay <= effectivePeriodLength;
    const isOvulationToday = today.toDateString() === ovulationDate.toDateString();
    const isFertileToday = today >= fertileWindowStart && today <= fertileWindowEnd;

    if (isPeriodToday) {
      currentPhase = 'menstruelle';
      conceptionChance = 'faible';
    } else if (isOvulationToday) {
      currentPhase = 'ovulatoire';
      conceptionChance = 'très haute';
    } else if (isFertileToday) {
      currentPhase = 'ovulatoire';
      conceptionChance = 'haute';
    } else if (today < ovulationDate) {
      currentPhase = 'folliculaire';
      conceptionChance = 'moyenne';
    } else {
      currentPhase = 'luteale';
      conceptionChance = 'faible';
    }

    // Jours restants avant les prochaines règles
    const diffNextPeriod = Math.ceil((nextPeriodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const diffOvulation = Math.ceil((ovulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const isLate = daysSinceStart > effectiveCycleLength && !isPeriodToday;
    const daysLate = isLate ? daysSinceStart - effectiveCycleLength : 0;

    const toIsoString = (d: Date) => d.toISOString().split('T')[0];

    const prediction: MenstrualPrediction = {
      nextPeriodStartDate: toIsoString(nextPeriodStart),
      nextPeriodEndDate: toIsoString(nextPeriodEnd),
      ovulationDate: toIsoString(ovulationDate),
      fertileWindowStart: toIsoString(fertileWindowStart),
      fertileWindowEnd: toIsoString(fertileWindowEnd),
      currentPhase,
      currentCycleDay,
      daysUntilNextPeriod: Math.max(0, diffNextPeriod),
      daysUntilOvulation: Math.max(0, diffOvulation),
      isFertileToday,
      isOvulationToday,
      isPeriodToday,
      conceptionChance,
      isLate,
      daysLate
    };

    console.log(`[Cycle] Prédiction calculée : Jour ${currentCycleDay}/${effectiveCycleLength}, Phase ${currentPhase}, Ovulation: ${prediction.ovulationDate}, Prochaines règles: ${prediction.nextPeriodStartDate}`);
    return prediction;
  }

  /**
   * Détermine le type/couleur gynécologique d'une date spécifique pour l'affichage du calendrier
   */
  public getDayClassification(
    targetDate: Date,
    lastPeriodStartDate: string,
    cycleLength: number = 28,
    periodLength: number = 5
  ): {
    phase: CyclePhase;
    isPeriod: boolean;
    isFertile: boolean;
    isOvulation: boolean;
    isLuteal: boolean;
    color: string;
    label: string;
    bgClass: string;
    textClass: string;
  } {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const start = new Date(lastPeriodStartDate);
    start.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Cycle modulé (prend en compte les cycles passés et futurs)
    const normalizedDay = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;

    const ovulationDay = cycleLength - 14;
    const fertileStart = ovulationDay - 5;
    const fertileEnd = ovulationDay + 1;

    const isPeriod = normalizedDay <= periodLength;
    const isOvulation = normalizedDay === ovulationDay;
    const isFertile = normalizedDay >= fertileStart && normalizedDay <= fertileEnd;
    const isLuteal = normalizedDay > ovulationDay;

    if (isPeriod) {
      return {
        phase: 'menstruelle',
        isPeriod: true,
        isFertile: false,
        isOvulation: false,
        isLuteal: false,
        color: '#ff7675',
        label: 'Règles',
        bgClass: 'bg-[#ff7675]',
        textClass: 'text-white'
      };
    }

    if (isOvulation) {
      return {
        phase: 'ovulatoire',
        isPeriod: false,
        isFertile: true,
        isOvulation: true,
        isLuteal: false,
        color: '#0984e3',
        label: 'Ovulation',
        bgClass: 'bg-[#0984e3]',
        textClass: 'text-white'
      };
    }

    if (isFertile) {
      return {
        phase: 'ovulatoire',
        isPeriod: false,
        isFertile: true,
        isOvulation: false,
        isLuteal: false,
        color: '#00b894',
        label: 'Fertile',
        bgClass: 'bg-[#00b894]/25 border border-[#00b894]',
        textClass: 'text-[#55efc4]'
      };
    }

    if (isLuteal) {
      return {
        phase: 'luteale',
        isPeriod: false,
        isFertile: false,
        isOvulation: false,
        isLuteal: true,
        color: '#a29bfe',
        label: 'Phase Lutéale',
        bgClass: 'bg-[#a29bfe]/20',
        textClass: 'text-[#a29bfe]'
      };
    }

    return {
      phase: 'folliculaire',
      isPeriod: false,
      isFertile: false,
      isOvulation: false,
      isLuteal: false,
      color: '#636e72',
      label: 'Phase Folliculaire',
      bgClass: 'bg-transparent',
      textClass: 'text-[#dfe6e9]'
    };
  }

  /**
   * Génère les conseils de bienveillance et attentions complices pour le couple
   */
  public getPartnerCareAdvice(phase: CyclePhase, dayOfCycle: number): {
    title: string;
    description: string;
    actionIdea: string;
    chatProposal: string;
    emoji: string;
  } {
    switch (phase) {
      case 'menstruelle':
        return {
          title: `Phase Menstruelle (Jour ${dayOfCycle}) 🌸`,
          description: "Son corps a besoin d'énergie, de chaleur et de douceur. Risque de fatigue ou crampes.",
          actionIdea: "Prépare une bouillotte chaude, une tisane douce et propose un massage délicat des pieds ou du dos.",
          chatProposal: "🌸 Mon cœur, j'ai vu que tu es dans ta période de règles. Je te prépare une bouillotte bien chaude et ton thé préféré ce soir ☕💜",
          emoji: '🌸'
        };
      case 'folliculaire':
        return {
          title: `Phase Folliculaire (Jour ${dayOfCycle}) 🌱`,
          description: "Regain naturel d'énergie, d'optimisme, de curiosité et d'enthousiasme partagé.",
          actionIdea: "Propose une sortie romantique imprévue, un restau à deux ou lancez un projet excitant.",
          chatProposal: "🌱 Tu as l'air pleine d'énergie en ce moment ! Si on se faisait une super sortie en amoureux ce soir ? ✨",
          emoji: '🌱'
        };
      case 'ovulatoire':
        return {
          title: `Pic d'Ovulation & Sensualité (Jour ${dayOfCycle}) ✨`,
          description: "Pic de rayonnement, fertilité maximale, sensualité intense et grande complicité amoureuse.",
          actionIdea: "Sortez le grand jeu : lingerie, bougies, compliment sincère et mots doux passionnés.",
          chatProposal: "✨ Tu es absolument rayonnante aujourd'hui... J'ai trop hâte qu'on se retrouve en tête-à-tête ce soir 🔥❤️",
          emoji: '✨'
        };
      case 'luteale':
        return {
          title: `Phase Lutéale & SPM Doux (Jour ${dayOfCycle}) 🌙`,
          description: "Baisse progressive de la progestérone : sensibilité émotionnelle accrue, besoin de sécurité.",
          actionIdea: "Évite tout stress inutile, offre sa friandise préférée et offre un long câlin réconfortant.",
          chatProposal: "🌙 Je suis là pour toi mon amour. Prends tout ton temps aujourd'hui, gros câlin et douceur au chaud ce soir 🧸💜",
          emoji: '🌙'
        };
    }
  }

  /**
   * Génère les rappels et notifications intelligents
   */
  public generateSmartNotifications(prediction: MenstrualPrediction): string[] {
    const notifications: string[] = [];

    if (prediction.isLate) {
      notifications.push(`⚠️ Tes règles sont en retard de ${prediction.daysLate} jour(s). Pense à enregistrer tes symptômes.`);
    } else if (prediction.daysUntilNextPeriod <= 2 && prediction.daysUntilNextPeriod > 0) {
      notifications.push(`🌸 Tes règles devraient commencer dans ${prediction.daysUntilNextPeriod} jour(s). Prépare tes indispensables !`);
    } else if (prediction.isPeriodToday) {
      notifications.push(`🌸 Règles en cours : Jour ${prediction.currentCycleDay} de ton cycle. Repos et chaleur bienfaisante.`);
    }

    if (prediction.isOvulationToday) {
      notifications.push(`🔵 Jour d'ovulation estimé aujourd'hui ! Fertilité maximale.`);
    } else if (prediction.isFertileToday) {
      notifications.push(`🟢 Tu es dans ta fenêtre fertile (Chances de conception : ${prediction.conceptionChance}).`);
    }

    return notifications;
  }

  /**
   * Sauvegarde et synchronise les données du cycle dans Supabase et localement
   */
  public async saveCycleData(
    userId: string,
    coupleId: string | null,
    data: CycleData
  ): Promise<CycleData> {
    try {
      const updatedPrediction = this.calculatePredictions(
        data.lastPeriodStartDate,
        data.cycleLength,
        data.periodLength,
        data.history || []
      );

      const advice = this.getPartnerCareAdvice(updatedPrediction.currentPhase, updatedPrediction.currentCycleDay);

      const fullData: CycleData = {
        ...data,
        dayOfCycle: updatedPrediction.currentCycleDay,
        currentPhase: updatedPrediction.currentPhase,
        prediction: updatedPrediction,
        careTipsForPartner: {
          title: advice.title,
          description: advice.description,
          actionIdea: advice.actionIdea,
          icon: advice.emoji
        }
      };

      // Sauvegarde locale instantanée
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
        if (fullData.history) {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(fullData.history));
        }
      } catch (storageErr) {
        console.warn('[Cycle] LocalStorage warning:', storageErr);
      }

      // Synchronisation Cloud Supabase si en ligne
      if (isSupabaseConfigured() && userId) {
        try {
          const payload = {
            user_id: userId,
            couple_id: coupleId,
            cycle_start_date: fullData.lastPeriodStartDate,
            cycle_length: fullData.cycleLength,
            period_length: fullData.periodLength,
            ovulation_day: updatedPrediction.ovulationDate,
            fertile_window_start: updatedPrediction.fertileWindowStart,
            fertile_window_end: updatedPrediction.fertileWindowEnd,
            current_phase: fullData.currentPhase,
            mood: fullData.mood,
            energy_level: fullData.energyLevel,
            symptoms: fullData.selectedSymptoms || [],
            daily_logs: fullData.dailyLogs || {},
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('menstrual_cycles')
            .upsert(payload, { onConflict: 'user_id' });

          if (error) {
            console.warn('[Cycle] Supabase sync notice (table may be created in migration):', error.message);
          } else {
            console.log('[Cycle] Synchronisation Supabase réussie avec succès.');
          }
        } catch (supabaseErr) {
          console.warn('[Cycle] Supabase sync error handled:', supabaseErr);
        }
      }

      return fullData;
    } catch (err) {
      console.error('[Cycle] saveCycleData error:', err);
      return data;
    }
  }

  /**
   * Charge les données de cycle (LocalStorage en priorité avec re-calcul dynamique des prédictions à aujourd'hui)
   */
  public loadCycleData(): CycleData {
    const defaultData: CycleData = {
      dayOfCycle: 14,
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currentPhase: 'ovulatoire',
      mood: 'joyeuse',
      energyLevel: 4,
      selectedSymptoms: [],
      history: [],
      dailyLogs: {},
      careTipsForPartner: {
        title: 'Pic d’Ovulation & Sensualité ✨',
        description: 'Elle est au sommet de son rayonnement ! Idéal pour sortir le grand jeu : lingerie, dîner romantique, mots doux et passion.',
        actionIdea: 'Petite attention personnalisée prête à envoyer',
        icon: 'Sparkles'
      }
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CycleData = JSON.parse(stored);
        let history: CycleHistoryItem[] = parsed.history || [];
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (storedHistory) {
          history = JSON.parse(storedHistory);
        }

        const prediction = this.calculatePredictions(
          parsed.lastPeriodStartDate || defaultData.lastPeriodStartDate,
          parsed.cycleLength || defaultData.cycleLength,
          parsed.periodLength || defaultData.periodLength,
          history
        );

        const advice = this.getPartnerCareAdvice(prediction.currentPhase, prediction.currentCycleDay);

        return {
          ...defaultData,
          ...parsed,
          history,
          dayOfCycle: prediction.currentCycleDay,
          currentPhase: prediction.currentPhase,
          prediction,
          careTipsForPartner: {
            title: advice.title,
            description: advice.description,
            actionIdea: advice.actionIdea,
            icon: advice.emoji
          }
        };
      }
    } catch (e) {
      console.warn('[Cycle] Error loading cycle data:', e);
    }

    const initialPrediction = this.calculatePredictions(
      defaultData.lastPeriodStartDate,
      defaultData.cycleLength,
      defaultData.periodLength
    );

    return {
      ...defaultData,
      prediction: initialPrediction
    };
  }
}

export const cycleService = new CycleService();
