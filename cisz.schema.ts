import dayjs from "dayjs";

const fmtDate = (d?: string | null, withTime = false): string => {
    if (!d || typeof d !== 'string') return '';
    
    if (!/^\d{4}/.test(d)) return d;

    if (d.length === 4) return d;
    if (d.length === 7) return d.split('-').reverse().join('.');

    const parsed = dayjs(d);
    if (!parsed.isValid()) return d;

    const hasTime = withTime && d.includes('T');
    return parsed.format(hasTime ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY');
};

export interface ResourceMeta {
    scope?: 'root' | 'patient' | 'organization';
    eager?: string[];
    title?: (r: any) => string | null | undefined;
    getPatientRef?: (r: any) => string | null;
    getOrganizationRef?: (r: any) => string | null;
}

const toRef = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val.reference === 'string') return val.reference;
    if (typeof val.reference === 'object' && val.reference) return toRef(val.reference);
    return null;
};

export const CISZ_SCHEMA: Record<string, ResourceMeta> = {
    AdverseEvent: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const orgExt = r.extension?.find((e: any) => e.url?.includes('RequestFromOrganization'));
            return toRef(orgExt?.valueReference) || toRef(r.location);
        },
        title: (r: any) => {
            const titleName = r.resultingEffect?.[0]?.display || r.code?.coding?.[0]?.display || r.code?.text || r.code?.coding?.[0]?.code || 'Послеоперационное осложнение';
            const cat = (Array.isArray(r.category) ? r.category[0] : r.category)?.coding?.[0]?.display;
            const catStr = cat ? ` (${cat})` : '';
            const d = fmtDate(r.detected || r.occurrenceDateTime || r.date);
            return `${titleName}${catStr}${d ? ` от ${d}` : ''}`;
        }
    },

    AllergyIntolerance: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: () => null,
        title: (r: any) => {
            const trigger = r.extension?.find((e: any) => e.url?.includes('AllergyTriggerString'))?.valueString || r.extension?.find((e: any) => e.url?.includes('MedicationAllergy'))?.valueReference?.display || r.reaction?.[0]?.extension?.find((e: any) => e.url?.includes('ReactionSubstanceString'))?.valueString || r.type?.coding?.[0]?.display || 'Аллергия / непереносимость';
            const crit = r.criticality === 'high' ? ' (Высокий риск)' : '';
            const d = fmtDate(r.onsetDateTime || r.onsetPeriod?.start || r.onsetString);
            return `${trigger}${crit}${d ? ` от ${d}` : ''}`;
        }
    },

    Appointment: {
        scope: 'patient',
        getPatientRef: (r) => {
            const patParticipant = (r.participant || []).find((p: any) => toRef(p.actor)?.startsWith('Patient/'));
            return toRef(r.subject) || toRef(patParticipant?.actor);
        },
        getOrganizationRef: (r) => {
            const orgParticipant = (r.participant || []).find((p: any) => toRef(p.actor)?.startsWith('Organization/'));
            const identAssigner = Array.isArray(r.identifier) ? r.identifier[0]?.assigner : r.identifier?.assigner;
            return toRef(orgParticipant?.actor) || toRef(identAssigner);
        },
        title: (r: any) => {
            const srv = r.serviceType?.[0]?.concept?.coding?.[0]?.display || r.serviceType?.[0]?.concept?.text || r.appointmentType?.coding?.[0]?.display || r.description || 'Запись на прием';
            const idVal = Array.isArray(r.identifier) ? r.identifier[0]?.value : r.identifier?.value;
            const num = idVal ? ` (№ ${idVal})` : '';
            const d = fmtDate(r.start || r.created, true);
            return `${srv}${num}${d ? ` на ${d}` : ''}`;
        }
    },

    AuditEvent: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: (r) => {
            const agentWho = Array.isArray(r.agent) ? r.agent[0]?.who : r.agent?.who;
            return toRef(agentWho) || toRef(r.source?.observer);
        },
        title: (r: any) => {
            const reason = r.code?.coding?.[0]?.display || r.code?.text || r.code?.coding?.[0]?.code || 'Событие аудита';
            const d = fmtDate(r.recorded || r.occurredPeriod?.start || r.occurredDateTime);
            return `${reason}${d ? ` от ${d}` : ''}`;
        }
    },

    Basic: {
        scope: 'organization',
        getPatientRef: () => null,
        getOrganizationRef: (r) => {
            const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
            return toRef(idents[0]?.assigner) || toRef(r.author);
        },
        title: (r: any) => {
            const exts = r.extension || [];
            const desc = exts.find((e: any) => e.url?.includes('StudyDescription'))?.valueString;
            const modality = exts.find((e: any) => e.url?.includes('Modality'))?.valueString;
            const bodyPart = exts.find((e: any) => e.url?.includes('BodyPartExamined'))?.valueString;
            const name = desc || [modality, bodyPart].filter(Boolean).join(' ') || 'Метаданные изображения';
            const d = fmtDate(r.created || exts.find((e: any) => e.url?.includes('SeriesStarted'))?.valueDateTime);
            return `${name}${d ? ` от ${d}` : ''}`;
        }
    },

    Bundle: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: () => null,
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profMap: Record<string, string> = { BundleMREC: 'Заключение МРЭК', BundleTD: 'Пакет документов ЭЛН', BundleHospitalisation: 'Пакет документов ЭВЭ', BundleVKK: 'Заключение ВКК', BundleBirth: 'Справка о рождении', BundleDeathCertificate: 'Свидетельство о смерти', BundleStillbirth: 'Свидетельство о мертворождении', MedicationDocument: 'Медицинские данные' };
            const title = profMap[prof] || (r.type === 'document' ? 'Электронный медицинский документ' : 'Пакет ресурсов');
            const num = r.identifier?.value ? ` №${r.identifier.value}` : '';
            const d = fmtDate(r.timestamp);
            return `${title}${num}${d ? ` от ${d}` : ''}`;
        }
    },

    CarePlan: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
            return toRef(r.custodian) || toRef(idents[0]?.assigner);
        },
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            let mainTitle = r.title;
            if (!mainTitle) {
                if (prof === 'Dispanserisation') { mainTitle = (Array.isArray(r.category) ? r.category[0] : r.category)?.coding?.[0]?.display || 'Диспансеризация'; }
                else if (prof === 'IPR') { mainTitle = 'Программа реабилитации инвалида (ИПР)'; }
                else if (prof === 'MedExaminReport') { mainTitle = (Array.isArray(r.category) ? r.category[0] : r.category)?.coding?.[0]?.display || 'Протокол медосмотра'; }
                else if (prof === 'CarePlanRadiotherapy') { mainTitle = 'План лучевой терапии'; }
                else { mainTitle = 'План лечения'; }
            }
            const num = r.identifier?.[0]?.value ? ` №${r.identifier[0].value}` : '';
            const d = fmtDate(r.created || r.period?.start);
            return `${mainTitle}${num}${d ? ` от ${d}` : ''}`;
        }
    },

    ClinicalImpression: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
            const perf = Array.isArray(r.performer) ? r.performer[0] : r.performer;
            const perfRef = toRef(perf);
            return toRef(idents[0]?.assigner) || (perfRef?.startsWith('Organization/') ? perfRef : null);
        },
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profNames: Record<string, string> = { ConclusionMREC: 'Заключение МРЭК', ConclusionVKK: 'Заключение ВКК', MedAssessmentWeaponOwnership: 'Освидетельствование: владение оружием', MedAssessmentMilitary: 'Освидетельствование: госслужба', MedAssessmentCommunicableDiseases: 'Освидетельствование: инфекционные заболевания', MedAssessmentCommon: 'Освидетельствование: наличие заболеваний', MedAssessmentMarineWork: 'Освидетельствование: работа на судах', MedAssessmentDriver: 'Освидетельствование: водительская комиссия', MedAssessmentSubstanceIntoxication: 'Освидетельствование: состояние опьянения', MedicalExaminDecision: 'Решение комиссии по медосмотру', Stillbirth: 'Свидетельство о мертворождении', DeathCertificate: 'Врачебное свидетельство о смерти', BirthCertificate: 'Сведения о рождении' };
            const base = profNames[prof] || r.description || 'Клиническое заключение';
            const num = r.identifier?.[0]?.value ? ` №${r.identifier[0].value}` : '';
            const exts = r.extension || [];
            const grp = exts.find((e: any) => e.url?.includes('DisabilityGroup'))?.valueCodeableConcept?.coding?.[0]?.display;
            const grpStr = grp ? ` (${grp})` : '';
            const d = fmtDate(r.date || r.effectiveDateTime || r.effectivePeriod?.start);
            return `${base}${num}${grpStr}${d ? ` от ${d}` : ''}`;
        }
    },

    Communication: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject) || toRef(Array.isArray(r.recipient) ? r.recipient[0] : r.recipient),
        getOrganizationRef: (r) => {
            const senderRef = toRef(r.sender);
            return senderRef?.startsWith('Organization/') ? senderRef : null;
        },
        title: (r: any) => {
            const statusMap: Record<string, string> = { 'in-progress': 'Новое', 'completed': 'Прочитано' };
            const st = r.status ? ` (${statusMap[r.status] || r.status})` : '';
            const d = fmtDate(r.sent || r.received);
            return `Уведомление для пациента${st}${d ? ` от ${d}` : ''}`;
        }
    },

    Composition: {
        scope: 'root',
        getPatientRef: (r) => {
            const subj = Array.isArray(r.subject) ? r.subject[0] : r.subject;
            return toRef(subj);
        },
        getOrganizationRef: (r) => toRef(r.custodian),
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profMap: Record<string, string> = { DocumentTD: 'Структура ЭЛН', StillbirthComposition: 'Электронное свидетельство о мертворождении', DeathCertificateComposition: 'Электронное свидетельство о смерти', BirthComposition: 'Электронная медицинская справка о рождении', PatientComposition: 'Пакет информации от пациента', CompDocument: 'Пакет медицинской информации о пациенте', DocumentHospitalisation: 'Выписной эпикриз', DocumentVKK: 'Структура документа (заключение ВКК)', DocumentMREC: 'Структура документа (заключение МРЭК)' };
            const title = profMap[prof] || r.title || r.type?.coding?.[0]?.display || 'Состав медицинского документа';
            const d = fmtDate(r.date);
            return `${title}${d ? ` от ${d}` : ''}`;
        }
    },

    Condition: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: () => null,
        title: (r: any) => r.code?.coding?.[0]?.display || r.code?.text || r.code?.coding?.[0]?.code || 'Диагноз'
    },

    Contract: {
        scope: 'patient',
        getPatientRef: (r) => {
            const subj = Array.isArray(r.subject) ? r.subject[0] : r.subject;
            return toRef(subj);
        },
        getOrganizationRef: (r) => {
            const auth = Array.isArray(r.authority) ? r.authority[0] : r.authority;
            return toRef(auth);
        },
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            if (prof === 'PlaceOfCare') { const org = Array.isArray(r.authority) ? r.authority[0]?.display : r.authority?.display; return `${r.title || 'Закрепление'}${org ? `: ${org}` : ''}`; }
            if (prof === 'RejectionBy') { const target = r.topicReference?.display || r.topic?.display || ''; return `${r.title || 'Отказ от медицинской услуги'}${target ? `: ${target}` : ''}`; }
            if (prof === 'TaskRejecter') { return `Отмена заказа документов${r.title ? ` (${r.title})` : ''}`; }
            if (prof === 'CancelOrder') { const topic = r.topicReference?.display || r.topic?.display || ''; const exp = r.expirationType?.coding?.[0]?.display || r.expirationType?.text || ''; return `${r.title || 'Отмена назначения'}${topic ? `: ${topic}` : ''}${exp ? ` (${exp})` : ''}`; }
            return r.title || 'Договор / Закрепление';
        }
    },

    Device: {
        scope: 'organization',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: (r) => toRef(r.owner),
        title: (r: any) => {
            const name = (Array.isArray(r.name) ? r.name[0]?.value : r.name?.value) || r.displayName || r.definition?.concept?.coding?.[0]?.display || r.definition?.concept?.text || 'Медицинское изделие';
            const model = r.modelNumber ? ` (${r.modelNumber})` : '';
            const sn = r.serialNumber ? ` [SN: ${r.serialNumber}]` : '';
            return `${name}${model}${sn}`;
        }
    },

    DeviceDefinition: {
        scope: 'organization',
        getPatientRef: () => null,
        getOrganizationRef: (r) => {
            const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
            return toRef(r.owner) || toRef(idents[0]?.assigner);
        },
        title: (r: any) => {
            const model = r.modelNumber || 'DICOM-принтер';
            const idVal = Array.isArray(r.identifier) ? r.identifier[0]?.value : r.identifier?.value;
            const num = idVal ? ` (№ ${idVal})` : '';
            return `${model}${num}`;
        }
    },

    DeviceDispense: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const performers = Array.isArray(r.performer) ? r.performer : (r.performer ? [r.performer] : []);
            for (const p of performers) {
                const actorRef = toRef(p.actor);
                if (actorRef?.startsWith('Organization/')) return actorRef;
            }
            return null;
        },
        title: (r: any) => {
            const devName = r.device?.concept?.coding?.[0]?.display || r.device?.concept?.text || r.device?.reference?.display || 'Обеспечение медизделием';
            const qty = r.quantity?.value !== undefined ? ` (${r.quantity.value} ${r.quantity.unit || ''})` : '';
            const d = fmtDate(r.whenHandedOver);
            return `${devName}${qty}${d ? ` от ${d}` : ''}`;
        }
    },

    DeviceRequest: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const fromOrg = r.extension?.find((e: any) => e.url?.includes('RequestFromOrganization'))?.valueReference;
            const perfRef = toRef(r.performer?.reference);
            return toRef(fromOrg) || (perfRef?.startsWith('Organization/') ? perfRef : null);
        },
        title: (r: any) => {
            const name = r.code?.concept?.coding?.[0]?.display || r.code?.concept?.text || r.codeCodeableConcept?.coding?.[0]?.display || r.codeCodeableConcept?.text || r.codeReference?.display || 'Медицинское изделие';
            const qty = r.quantity ? ` (${r.quantity} шт.)` : '';
            const d = fmtDate(r.authoredOn);
            return `${name}${qty}${d ? ` от ${d}` : ''}`;
        }
    },

    DiagnosticReport: {
        scope: 'patient',
        eager: ['specimen'],
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const performers = Array.isArray(r.performer) ? r.performer : (r.performer ? [r.performer] : []);
            for (const p of performers) {
                const ref = toRef(p);
                if (ref?.startsWith('Organization/')) return ref;
            }
            const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
            return toRef(idents[0]?.assigner);
        },
        title: (r: any) => {
            const titleName = r.code?.coding?.[0]?.display || r.code?.text || r.code?.concept?.coding?.[0]?.display || r.conclusionCode?.[0]?.coding?.[0]?.display || 'Заключение';
            const num = r.identifier?.[0]?.value ? ` (№ ${r.identifier[0].value})` : '';
            const d = fmtDate(r.effectiveDateTime || r.effectivePeriod?.start || r.issued);
            return `${titleName}${num}${d ? ` от ${d}` : ''}`;
        }
    },

    DocumentReference: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => toRef(r.custodian),
        title: (r: any) => {
            const titleStr = r.description || r.type?.coding?.[0]?.display || r.type?.text || r.content?.[0]?.attachment?.title || 'Медицинский документ';
            const d = fmtDate(r.date);
            return `${titleStr}${d ? ` от ${d}` : ''}`;
        }
    },

    Encounter: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => toRef(r.serviceProvider),
        title: (r: any) => {
            const typeStr = r.type?.[0]?.coding?.[0]?.display || r.type?.[0]?.text || r.class?.coding?.[0]?.display || r.class?.display || r.class?.code || 'Медицинское посещение';
            const d = fmtDate(r.actualPeriod?.start || r.period?.start);
            return `${typeStr}${d ? ` от ${d}` : ''}`;
        }
    },

    Endpoint: {
        scope: 'organization',
        getPatientRef: () => null,
        getOrganizationRef: (r) => toRef(r.managingOrganization),
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profTitles: Record<string, string> = { EndpointServiceRequest: 'Конечная точка: отказы от услуг', EndpointProvenanceNotification: 'Конечная точка: подпись документов ВН', EndpointSlots: 'Конечная точка: бронирование слотов', EndpointInvitaionAnswer: 'Конечная точка: госпитализация', EndpointHealthCheck: 'Конечная точка: проверка доступности API' };
            const base = profTitles[prof] || 'Конечная точка (Endpoint)';
            const addr = r.address ? ` [${r.address}]` : '';
            return `${base}${addr}`;
        }
    },

    EpisodeOfCare: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: (r) => toRef(r.managingOrganization),
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profNames: Record<string, string> = {
                EpisodeOfTemporaryDisabilitySum: 'Случай ВН',
                EpisodeOfTemporaryDisability: 'Сведения о ВН',
                Hospitalisation: 'Госпитализация',
                DayCare: 'Дневной стационар',
                EpisodeOfEmergencyCare: 'Скорая помощь'
            };
            const base = profNames[prof] || r.type?.[0]?.coding?.[0]?.display || r.type?.[0]?.text || 'Эпизод мед. помощи';
            const idVal = r.identifier?.find((i: any) => i.type?.coding?.[0]?.code === 'Team-call-card-number' || i.use === 'usual')?.value || r.identifier?.[0]?.value;
            const num = idVal ? ` (№ ${idVal})` : '';
            const d = fmtDate(r.period?.start);
            return `${base}${num}${d ? ` с ${d}` : ''}`;
        }
    },

    FamilyMemberHistory: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: () => null,
        title: (r: any) => `${r.relationship?.coding?.[0]?.display || r.relationship?.text || 'Родственник'}${r.name ? `: ${r.name}` : ''}${r.condition?.[0]?.code?.coding?.[0]?.display ? ` (${r.condition[0].code.coding[0].display})` : (r.condition?.[0]?.code?.text ? ` (${r.condition[0].code.text})` : '')}`
    },

    Flag: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const orgExt = r.extension?.find((e: any) => e.url?.includes('RequestFromOrganization'))?.valueReference;
            return toRef(orgExt);
        },
        title: (r: any) => {
            const desc = r.code?.extension?.find((e: any) => e.url?.includes('SpecialMarkString'))?.valueString || r.code?.coding?.[0]?.display || r.code?.text || 'Особая отметка о ВН';
            const d = fmtDate(r.extension?.find((e: any) => e.url?.includes('DateFlagReason'))?.valueDate);
            return `${desc}${d ? ` от ${d}` : ''}`;
        }
    },

    HealthcareService: {
        scope: 'organization',
        getPatientRef: () => null,
        getOrganizationRef: (r) => toRef(r.providedBy),
        title: (r: any) => {
            const sType = r.type?.[0]?.coding?.[0]?.display || r.type?.[0]?.text;
            const spec = (Array.isArray(r.specialty) ? r.specialty[0] : r.specialty)?.coding?.[0]?.display;
            const name = r.name || sType || (spec ? `Услуги: ${spec}` : 'Медицинская услуга');
            const org = r.providedBy?.display;
            const orgStr = org ? ` (${org})` : '';
            return `${name}${orgStr}`;
        }
    },

    ImagingStudy: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
            return toRef(idents[0]?.assigner);
        },
        title: (r: any) => `${r.procedure?.[0]?.concept?.coding?.[0]?.display || r.procedure?.[0]?.concept?.text || r.procedure?.[0]?.reference?.display || r.description || r.modality?.[0]?.coding?.[0]?.display || 'Визуальное исследование'}${r.started ? ` от ${fmtDate(r.started)}` : ''}`
    },

    Immunization: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: (r) => {
            const locRef = toRef(r.location);
            return locRef?.startsWith('Organization/') ? locRef : null;
        },
        title: (r: any) => {
            const vName = r.vaccineCode?.extension?.find((e: any) => e.url?.includes('AdministeredVaccine'))?.valueReference?.display || r.vaccineCode?.coding?.[0]?.display || r.vaccineCode?.text || 'Вакцинация';
            const d = fmtDate(r.occurrenceDateTime);
            return `${vName}${d ? ` от ${d}` : ''}`;
        }
    },

    ImmunizationRecommendation: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: (r) => toRef(r.authority),
        title: (r: any) => {
            const d = fmtDate(r.date);
            return `Рекомендации по вакцинации${r.recommendation?.length ? ` (${r.recommendation.length} поз.)` : ''}${d ? ` от ${d}` : ''}`;
        }
    },

    List: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const fromOrg = r.extension?.find((e: any) => e.url?.includes('FromOrganization'))?.valueReference;
            return toRef(fromOrg);
        },
        title: (r: any) => {
            const d = fmtDate(r.date);
            return `${r.title || 'Список назначенных препаратов'}${d ? ` от ${d}` : ''}${r.entry?.length ? ` (${r.entry.length} рец.)` : ''}`;
        }
    },

    Location: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: (r) => toRef(r.managingOrganization),
        title: (r: any) => r.name || (Array.isArray(r.alias) ? r.alias[0] : r.alias) || r.description || 'Структурное подразделение'
    },

    Medication: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: () => null,
        title: (r: any) => {
            const base = r.code?.text || r.code?.coding?.[0]?.display || r.ingredient?.[0]?.item?.concept?.coding?.[0]?.display || r.ingredient?.[0]?.item?.concept?.text || 'Лекарственный препарат';
            const ing = r.ingredient?.[0]?.item?.reference?.display ? ` [${r.ingredient[0].item.reference.display}]` : '';
            return `${base}${ing}`;
        }
    },

    MedicationRequest: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const infoSources = Array.isArray(r.informationSource) ? r.informationSource : [r.informationSource];
            return toRef(infoSources[0]);
        },
        title: (r: any) => r.medication?.extension?.find((e: any) => e.url?.includes('TradeNameMedication'))?.extension?.find((x: any) => x.url?.includes('TradeNameMedicationCode'))?.valueCodeableConcept?.coding?.[0]?.display || r.medication?.concept?.coding?.[0]?.display || r.medication?.concept?.text || r.medication?.reference?.display || 'Назначение лекарственного средства'
    },

    MedicationStatement: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const infoSources = Array.isArray(r.informationSource) ? r.informationSource : [r.informationSource];
            return toRef(infoSources[0]);
        },
        title: (r: any) => {
            const name = r.medication?.extension?.find((e: any) => e.url?.includes('TradeNameMedication'))?.extension?.find((x: any) => x.url?.includes('TradeNameMedicationCode'))?.valueCodeableConcept?.coding?.[0]?.display 
                || r.medication?.concept?.coding?.[0]?.display 
                || r.medication?.concept?.text 
                || r.medicationCodeableConcept?.coding?.[0]?.display 
                || r.medicationCodeableConcept?.text 
                || 'Отпуск лекарственного средства';
            const d = fmtDate(r.dateAsserted);
            return `${name}${d ? ` от ${d}` : ''}`;
        }
    },

    Observation: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const performers = Array.isArray(r.performer) ? r.performer : (r.performer ? [r.performer] : []);
            for (const p of performers) {
                const ref = toRef(p);
                if (ref?.startsWith('Organization/')) return ref;
            }
            return null;
        },
        title: (r: any) => r.code?.coding?.[0]?.display || r.code?.text || r.code?.coding?.[0]?.code || 'Показатель'
    },

    Organization: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: (r) => r.id ? `Organization/${r.id}` : null,
        title: (r: any) => r.name || (Array.isArray(r.alias) ? r.alias[0] : r.alias) || 'Организация'
    },

    Patient: {
        scope: 'root',
        getPatientRef: (r) => r.id ? `Patient/${r.id}` : null,
        getOrganizationRef: (r) => toRef(r.managingOrganization),
        title: (r: any) => r.name?.[0]?.text || [r.name?.[0]?.family, ...(r.name?.[0]?.given || [])].filter(Boolean).join(' ') || 'Пациент'
    },

    Practitioner: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: () => null,
        title: (r: any) => r.name?.[0]?.text || [r.name?.[0]?.family, ...(r.name?.[0]?.given || [])].filter(Boolean).join(' ') || 'Медицинский работник'
    },

    PractitionerRole: {
        scope: 'root',
        getPatientRef: () => null,
        getOrganizationRef: (r) => toRef(r.organization),
        title: (r: any) => r.practitioner?.display || r.code?.[0]?.coding?.[0]?.display || r.code?.[0]?.text || r.extension?.find((e: any) => e.url?.includes('PractitionerPosition'))?.extension?.find((x: any) => x.url?.includes('PractitionerPositionType'))?.valueCodeableConcept?.coding?.[0]?.display || 'Медицинский специалист'
    },

    Procedure: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const fromOrg = r.extension?.find((e: any) => e.url?.includes('FromOrganization'))?.valueReference;
            const perfOrg = (r.performer || []).find((p: any) => toRef(p.actor)?.startsWith('Organization/') || toRef(p.onBehalfOf)?.startsWith('Organization/'));
            return toRef(fromOrg) || toRef(perfOrg?.onBehalfOf) || toRef(perfOrg?.actor);
        },
        title: (r: any) => {
            const name = r.code?.coding?.[0]?.display || r.code?.text || r.code?.coding?.[0]?.code || 'Процедура';
            const d = fmtDate(r.occurrencePeriod?.start || r.occurrenceDateTime);
            return `${name}${d ? ` от ${d}` : ''}`;
        }
    },

    Provenance: {
        scope: 'patient',
        getPatientRef: (r) => {
            const target = Array.isArray(r.target) ? r.target[0] : r.target;
            const targetRef = toRef(target);
            return toRef(r.patient) || (targetRef?.startsWith('Patient/') ? targetRef : null);
        },
        getOrganizationRef: (r) => {
            const orgExt = r.extension?.find((e: any) => e.url?.includes('OrganizationReference'))?.valueReference;
            const orgAgent = (r.agent || []).find((a: any) => a.type?.coding?.[0]?.code === 'organization' || toRef(a.who)?.startsWith('Organization/'));
            return toRef(orgExt) || toRef(orgAgent?.who);
        },
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profMap: Record<string, string> = { ProvenanceDocumentInfoDeath: 'Сведения о подписании (ЭВСС / ЭВСМ)', ProvenanceDocumentInfoHosp: 'Сведения о подписании (ЭВЭ)', ProvenanceDocumentInfoBirth: 'Сведения о подписании (ЭМСР)', ProvenanceDocumentInfoVKK: 'Сведения о подписании (ВКК)', ProvenanceDocumentInfoMREC: 'Сведения о подписании (МРЭК)', ProvenanceDocumentInfoTD: 'Сведения о подписании (ВН)', ProvenanceTemporaryDisability: 'Требование подписи ВН' };
            const title = profMap[prof] || 'Сведения об авторе и подписании';
            const whoName = r.agent?.find((a: any) => a.type?.coding?.[0]?.code === 'practitioner')?.who?.display || r.agent?.[0]?.who?.display;
            const whoStr = whoName ? ` (${whoName})` : '';
            const d = fmtDate(r.recorded);
            return `${title}${whoStr}${d ? ` от ${d}` : ''}`;
        }
    },

    QuestionnaireResponse: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: () => null,
        title: (r: any) => {
            const q = r.questionnaire || '';
            const profs = r.meta?.profile || [];
            const check = (sub: string) => q.includes(sub) || profs.some((p: string) => p.includes(sub));

            let base = 'Анкета';
            if (check('ObstetrGynec')) base = 'Акушерско-гинекологический анамнез';
            else if (check('FamilyAnamnesis')) {
                const burden = r.item?.find((i: any) => i.linkId === '1')?.answer?.[0]?.valueBoolean;
                base = `Семейный анамнез${burden ? ' (Отягощен)' : ''}`;
            } else if (check('Autism')) base = 'Скрининг на аутизм';
            else if (check('Dispanserisation')) base = 'Анкета диспансеризации';
            else if (check('SpecialInformation') || check('MotherSpecial')) base = 'Сведения о матери';
            else if (check('UnwantedReaction')) base = 'Нежелательные реакции на ЛС';
            else if (check('AllergicReaction') || check('AllergologyAnamnesis')) base = 'Аллергологический анамнез';
            else if (check('ChildUnder3')) base = 'Анамнез ребенка до 3 лет';
            else if (check('ChildFrom3To18')) base = 'Анамнез ребенка от 3 до 18 лет';
            else if (check('BadHabits')) base = 'Анамнез: вредные привычки';
            else if (check('LivingConditions')) base = 'Анамнез: жилищные условия';
            else if (check('PreviousDiseases')) base = 'Анамнез: перенесенные заболевания';
            else if (check('OccupationHistory')) base = 'Анамнез: трудовой';
            else if (check('FisicalDevelopment')) base = 'Анамнез: физическое развитие';
            else if (check('Transfusiology')) base = 'Трансфузиологический анамнез';

            const d = fmtDate(r.authored);
            return `${base}${d ? ` от ${d}` : ''}`;
        }
    },

    RelatedPerson: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.patient),
        getOrganizationRef: () => null,
        title: (r: any) => {
            const rel = (Array.isArray(r.relationship) ? r.relationship[0] : r.relationship)?.coding?.[0]?.display || 'Представитель';
            const name = r.name?.[0]?.text || [r.name?.[0]?.family, ...(r.name?.[0]?.given || [])].filter(Boolean).join(' ');
            return name ? `${rel}: ${name}` : rel;
        }
    },

    Schedule: {
        scope: 'organization',
        getPatientRef: () => null,
        getOrganizationRef: (r) => {
            const orgExt = r.extension?.find((e: any) => e.url?.includes('OrganizationReference'))?.valueReference;
            const orgActor = (r.actor || []).find((a: any) => toRef(a)?.startsWith('Organization/'));
            return toRef(orgExt) || toRef(orgActor);
        },
        title: (r: any) => {
            const name = r.name || 'Расписание';
            const spec = (Array.isArray(r.specialty) ? r.specialty[0] : r.specialty)?.coding?.[0]?.display;
            const specStr = spec ? ` (${spec})` : '';
            const horizon = r.planningHorizon;
            let periodStr = '';
            if (horizon?.start) {
                const s = fmtDate(horizon.start);
                const e = horizon.end ? fmtDate(horizon.end) : '';
                periodStr = e && s !== e ? ` [${s} - ${e}]` : ` [с ${s}]`;
            }
            return `${name}${specStr}${periodStr}`;
        }
    },

    ServiceRequest: {
        scope: 'patient',
        eager: ['specimen'],
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: (r) => {
            const fromOrg = r.extension?.find((e: any) => e.url?.includes('FromOrganization') || e.url?.includes('RequestFromOrganization'))?.valueReference;
            const performers = Array.isArray(r.performer) ? r.performer : (r.performer ? [r.performer] : []);
            for (const p of performers) {
                const ref = toRef(p);
                if (ref?.startsWith('Organization/')) return ref;
            }
            return toRef(fromOrg);
        },
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profNames: Record<string, string> = {
                ServiceRequestBioMatResearch: 'Направление на исследование биоматериала',
                ServiceRequestBioMatCollection: 'Направление на забор биоматериала',
                ServiceRequestUltrasound: 'Направление на УЗИ',
                ServiceRequestHospitalisation: 'Направление на госпитализацию',
                ServiceRequestHomeVisit: 'Вызов врача на дом',
                ServiceRequestImmunization: 'Направление на вакцинацию',
                ServiceRequestDispanserisation: 'Направление на диспансеризацию',
                ServiceRequestMedExam: 'Направление на медосмотр',
                ServiceRequestLab: 'Направление на лабораторное исследование',
                ServiceRequestConsult: 'Направление на консультацию',
                ServiceRequestPhysiotherapy: 'Направление на физиотерапию',
                ServiceRequestRadiotherapy: 'Направление на лучевую терапию',
                ServiceRequestEndoscopy: 'Направление на эндоскопию',
                ServiceRequestImaging: 'Направление на визуальное исследование',
                ServiceRequestFunctDiagn: 'Направление на функциональную диагностику'
            };

            const serviceName = r.code?.concept?.coding?.[0]?.display 
                || r.code?.coding?.[0]?.display 
                || r.code?.concept?.text 
                || r.code?.text 
                || profNames[prof] 
                || 'Направление';

            const num = r.identifier?.[0]?.value ? ` (№ ${r.identifier[0].value})` : '';
            const procNum = r.extension?.find((e: any) => e.url?.includes('ProcedureNumber'))?.valueUnsignedInt;
            const procStr = procNum ? ` (${procNum} проц.)` : '';
            const d = fmtDate(r.authoredOn || r.occurrenceDateTime || r.occurrencePeriod?.start);
            return `${serviceName}${num}${procStr}${d ? ` от ${d}` : ''}`;
        }
    },

    Slot: {
        scope: 'organization',
        getPatientRef: () => null,
        getOrganizationRef: (r) => {
            const orgExt = r.extension?.find((e: any) => e.url?.includes('OrganizationReference') || e.url?.includes('RequestFromOrganization'))?.valueReference;
            return toRef(orgExt);
        },
        title: (r: any) => {
            const statusMap: Record<string, string> = { free: 'Свободный слот', busy: 'Занятый слот', 'busy-unavailable': 'Недоступный слот', 'busy-tentative': 'Слот (бронь)' };
            const service = r.serviceType?.[0]?.concept?.coding?.[0]?.display || r.serviceType?.[0]?.concept?.text || statusMap[r.status] || 'Слот приема';
            const d = fmtDate(r.start, true);
            return `${service}${d ? ` на ${d}` : ''}`;
        }
    },

    Specimen: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.subject),
        getOrganizationRef: () => null,
        title: (r: any) => {
            const mat = r.type?.coding?.[0]?.display || r.type?.text || 'Биоматериал';
            const site = r.collection?.bodySite?.concept?.coding?.[0]?.display || r.collection?.bodySite?.concept?.text;
            const siteStr = site ? `, ${site.toLowerCase()}` : '';
            const num = r.identifier?.[0]?.value ? ` (№ ${r.identifier[0].value})` : '';
            const d = fmtDate(r.collection?.collectedDateTime);
            return `${mat}${siteStr}${num}${d ? ` от ${d}` : ''}`;
        }
    },

    Task: {
        scope: 'patient',
        getPatientRef: (r) => toRef(r.for) || toRef(r.requester),
        getOrganizationRef: (r) => {
            const reqRef = toRef(r.requester);
            const releaseOrg = r.extension?.find((e: any) => e.url?.includes('ReleaseFor'))?.extension?.find((x: any) => x.url?.includes('ReleaseForReference'))?.valueReference;
            return toRef(releaseOrg) || (reqRef?.startsWith('Organization/') ? reqRef : null);
        },
        title: (r: any) => {
            const prof = r.meta?.profile?.[0]?.split('/')?.pop() || '';
            const profMap: Record<string, string> = { OrderingDocument: 'Заказ медицинских документов', EpisodeToBePaid: 'Требование к оплате случая ВН', TaskCreatePersAccount: 'Создание аккаунта в ЛКП' };
            const docKind = r.code?.coding?.[0]?.display || r.code?.text;
            const title = docKind ? `Заказ: ${docKind}` : (profMap[prof] || 'Задача / Требование');
            const statusMap: Record<string, string> = { requested: 'Отправлен', 'in-progress': 'В работе', ready: 'Готов', completed: 'Выполнен', rejected: 'Отказано' };
            const st = r.status ? ` (${statusMap[r.status] || r.status})` : '';
            const d = fmtDate(r.authoredOn || r.executionPeriod?.start);
            return `${title}${st}${d ? ` от ${d}` : ''}`;
        }
    }
};