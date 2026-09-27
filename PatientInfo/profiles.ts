const PROFILES = [
    {
        id: 'AdverseEvent',
        name: 'Осложнения',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/SurgeryComplication',
                name: 'Послеоперационное осложнение'
            }
        ]
    },
    {
        id: 'AllergyIntolerance',
        name: 'Аллергии и непереносимости',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/AllergyIntoleranceBy',
                name: 'Информация об аллергии или непереносимости у пациента'
            }
        ]
    },
    {
        id: 'Appointment',
        name: 'Записи на прием',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/AppointmentBy',
                name: 'Бронирование слота для медицинской услуги'
            }
        ]
    },
    {
        id: 'Basic',
        name: 'Базовые ресурсы',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ImagingStudyBasic',
                name: 'Метаданные переданных медицинских изображений'
            }
        ]
    },
    {
        id: 'CarePlan',
        name: 'Планы лечения и диспансеризация',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/Dispanserisation',
                name: 'Диспансеризация'
            },
            {
                id: 'https://fhir.by/StructureDefinition/IPR',
                name: 'Индивидуальная программа реабилитации, абилитации инвалида (ИПР)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/CarePlanRadiotherapy',
                name: 'План проведения лучевой терапии'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedExaminReport',
                name: 'Протокол медицинского осмотра работающих'
            }
        ]
    },
    {
        id: 'ClinicalImpression',
        name: 'Медицинские освидетельствования и решения',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ConclusionVKK',
                name: 'Заключение ВКК'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ConclusionMREC',
                name: 'Заключение МРЭК'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentWeaponOwnership',
                name: 'Освидетельствование: владение оружием'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentCommunicableDiseases',
                name: 'Освидетельствование: опасность для здоровья населения'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentMilitary',
                name: 'Освидетельствование: государственная и воинская служба'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentCommon',
                name: 'Освидетельствование: подтверждение наличия/отсутствия иных заболеваний'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentMarineWork',
                name: 'Освидетельствование: работа на морских судах'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentDriver',
                name: 'Освидетельствование: управление транспортными средствами'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedAssessmentSubstanceIntoxication',
                name: 'Освидетельствование: состояние опьянения'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedicalExaminDecision',
                name: 'Решение комиссии по результатам медосмотра работающего'
            },
            {
                id: 'https://fhir.by/StructureDefinition/Stillbirth',
                name: 'Сведения врачебного свидетельства о мертворождении'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DeathCertificate',
                name: 'Сведения врачебного свидетельства о смерти'
            },
            {
                id: 'https://fhir.by/StructureDefinition/BirthCertificate',
                name: 'Сведения о рождении'
            }
        ]
    },
    {
        id: 'Condition',
        name: 'Диагнозы',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/FinalDiagnosis',
                name: 'Диагноз'
            }
        ]
    },
    {
        id: 'Contract',
        name: 'Закрепления и отказы',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/PlaceOfCare',
                name: 'Закрепление за медицинской организацией'
            },
            {
                id: 'https://fhir.by/StructureDefinition/TaskRejecter',
                name: 'Отмена задачи на выдачу медицинских документов'
            },
            {
                id: 'https://fhir.by/StructureDefinition/RejectionBy',
                name: 'Отказ от медицинской услуги'
            },
            {
                id: 'https://fhir.by/StructureDefinition/CancelOrder',
                name: 'Отмена назначения лекарственного средства или медизделия'
            }
        ]
    },
    {
        id: 'Device',
        name: 'Медицинские изделия и аппараты',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/DeviceImagingStudy',
                name: 'DICOM-устройства'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DeviceForPatient',
                name: 'Изделие медицинского назначения, которым был обеспечен пациент'
            }
        ]
    },
    {
        id: 'DeviceDefinition',
        name: 'Описания оборудования',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/DeviceDefinitionDicomPrinter',
                name: 'Описание DICOM принтера'
            }
        ]
    },
    {
        id: 'DeviceDispense',
        name: 'Факты выдачи медицинских изделий',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/DevicePatientDispenseBy',
                name: 'Факт обеспечения пациента изделием медицинского назначения или медицинской техникой'
            }
        ]
    },
    {
        id: 'DeviceRequest',
        name: 'Назначения медицинских изделий',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/DeviceOrder',
                name: 'Назначение изделия медицинского назначения и медицинской техники'
            }
        ]
    },
    {
        id: 'DiagnosticReport',
        name: 'Диагностические заключения',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ImagingDiagnosticReport',
                name: 'Заключение диагностического исследования'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DiagnosticReportBioMatResearch',
                name: 'Заключение исследования биологического материала'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DiagnosticReportLab',
                name: 'Заключение лабораторного исследования'
            },
            {
                id: 'https://fhir.by/StructureDefinition/RadioisotopeDiagnosticReport',
                name: 'Заключение по результатам радиоизотопного исследования'
            },
            {
                id: 'https://fhir.by/StructureDefinition/UltrasoundDiagnosticReport',
                name: 'Заключение по результатам ультразвукового исследования (УЗИ)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DiagnosticReportFluorography',
                name: 'Заключение профилактической рентгенографии грудной клетки'
            },
            {
                id: 'https://fhir.by/StructureDefinition/FunctDiagDiagnosticReport',
                name: 'Заключение функционального исследования'
            }
        ]
    },
    {
        id: 'DocumentReference',
        name: 'Неструктурированные документы',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/AttachDocument',
                name: 'Неструктурированный документ'
            }
        ]
    },
    {
        id: 'Encounter',
        name: 'Обращения за медицинской помощью',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/EncounterGeneral',
                name: 'Общий профиль для обращения пациента за медицинской помощью'
            }
        ]
    },
    {
        id: 'EpisodeOfCare',
        name: 'Эпизоды медицинской помощи и нетрудоспособность',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/Hospitalisation',
                name: 'Случай госпитализации'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DayCare',
                name: 'Лечение в условиях дневного стационара'
            },
            {
                id: 'https://fhir.by/StructureDefinition/EpisodeOfTemporaryDisabilitySum',
                name: 'Непрерывный случай временной нетрудоспособности'
            },
            {
                id: 'https://fhir.by/StructureDefinition/EpisodeOfTemporaryDisability',
                name: 'Сведения о временной нетрудоспособности'
            },
            {
                id: 'https://fhir.by/StructureDefinition/EpisodeOfEmergencyCare',
                name: 'Эпизод оказания скорой медицинской помощи'
            }
        ]
    },
    {
        id: 'FamilyMemberHistory',
        name: 'Семейный анамнез',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/FamilyMemberHistoryBy',
                name: 'Заболевание или состояние родственника'
            }
        ]
    },
    {
        id: 'Flag',
        name: 'Особые отметки',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/FlagTemporaryDisability',
                name: 'Особые отметки о временной нетрудоспособности'
            }
        ]
    },
    {
        id: 'HealthcareService',
        name: 'Медицинские услуги',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/HealthcareServiceForTransaction',
                name: 'Информация о медицинских услугах в контексте расписания'
            }
        ]
    },
    {
        id: 'ImagingStudy',
        name: 'Снимки и визуальные исследования',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ImagingStudyBy',
                name: 'Набор изображений исследования'
            }
        ]
    },
    {
        id: 'Immunization',
        name: 'Вакцинация',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ImmunizationBy',
                name: 'Случай введения пациенту вакцины'
            }
        ]
    },
    {
        id: 'ImmunizationRecommendation',
        name: 'Планы профилактических прививок',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ImmunizationRecommendationBy',
                name: 'Набор рекомендаций по проведению профилактических прививок'
            }
        ]
    },
    {
        id: 'List',
        name: 'Списки',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/PrescriptionList',
                name: 'Список назначенных рецептурных препаратов'
            }
        ]
    },
    {
        id: 'MedicationRequest',
        name: 'Назначения лекарств и рецепты',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/MedicationPrescriptionDP',
                name: 'Выписанный рецепт'
            },
            {
                id: 'https://fhir.by/StructureDefinition/MedicationOrder',
                name: 'Назначение лекарственного средства'
            }
        ]
    },
    {
        id: 'Observation',
        name: 'Осмотры, измерения и анализы',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/AnthropometricDataBy',
                name: 'Антропометрические данные'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ObservationLabMicroorganism',
                name: 'Данные о найденном микроорганизме в ходе бактериологического исследования'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ObservationLabTest',
                name: 'Данные показателя лабораторного исследования'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ObservationSubjective',
                name: 'Жалобы и субъективная оценка состояния'
            },
            {
                id: 'https://fhir.by/StructureDefinition/VitalSignsBy',
                name: 'Жизненно важные показатели'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ObservationObjective',
                name: 'Объективный осмотр'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ObservationUltrasound',
                name: 'Показатели ультразвуковой диагностики'
            },
            {
                id: 'https://fhir.by/StructureDefinition/GeneralFunctionalResearch',
                name: 'Показатели функционального исследования'
            }
        ]
    },
    {
        id: 'Procedure',
        name: 'Вмешательства и процедуры',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/SurgicalProcedure',
                name: 'Оперативное или диагностическое вмешательство'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProcedureBioMatCollection',
                name: 'Процедура взятия биологического материала'
            },
            {
                id: 'https://fhir.by/StructureDefinition/PhysiotherapyProcedure',
                name: 'Процедура физиотерапевтического лечения'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProcedureFunctDiagn',
                name: 'Процедура функционального исследования'
            },
            {
                id: 'https://fhir.by/StructureDefinition/RadiotherapyProcedure',
                name: 'Сеанс лучевой терапии'
            }
        ]
    },
    {
        id: 'Provenance',
        name: 'Сведения об авторах и подписании документов',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceDocumentInfoDeath',
                name: 'Сводная информация о медработнике и организации — ЭВСС и ЭВСМ'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceDocumentInfoHosp',
                name: 'Сводная информация о медработнике и организации — ЭВЭ'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceDocumentInfoBirth',
                name: 'Сводная информация о медработнике и организации — ЭМСР'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceDocumentInfoVKK',
                name: 'Сводная информация о медработнике и организации — заключение ВКК'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceDocumentInfoMREC',
                name: 'Сводная информация о медработнике и организации — заключение МРЭК'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceDocumentInfoTD',
                name: 'Сводная информация о медработнике и организации для документов о ВН'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ProvenanceTemporaryDisability',
                name: 'Требование для подписи документа о ВН'
            }
        ]
    },
    {
        id: 'QuestionnaireResponse',
        name: 'Ответы на анкеты и анамнез',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/AutismScreeningTestFormAnswers',
                name: 'Ответы по тесту на аутизм для детей'
            },
            {
                id: 'https://fhir.by/StructureDefinition/DispanserisationFormAnswers',
                name: 'Ответы по анкете для диспансеризации'
            },
            {
                id: 'https://fhir.by/StructureDefinition/QRSpecialInformation',
                name: 'Специальные сведения о матери'
            },
            {
                id: 'https://fhir.by/StructureDefinition/QRUnwantedReaction',
                name: 'Информация о нежелательных реакциях на лекарственные средства'
            },
            {
                id: 'https://fhir.by/StructureDefinition/QRAllergicReaction',
                name: 'Информация об аллергических реакциях'
            },
            {
                id: 'https://fhir.by/StructureDefinition/QRObstetrGynecAnamnesis',
                name: 'Ответы по акушерско-гинекологическому анамнезу'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AllergologyAnamnesis',
                name: 'Ответы по аллергологическому анамнезу'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVBadHabits',
                name: 'Ответы по анамнезу жизни (вредные привычки)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVLivingConditions',
                name: 'Ответы по анамнезу жизни (жилищные условия)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVPreviousDiseases',
                name: 'Ответы по анамнезу жизни (перенесенные заболевания)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVOccupationHistory',
                name: 'Ответы по анамнезу жизни (трудовой анамнез)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVChildUnder3',
                name: 'Ответы по анамнезу жизни для ребенка в возрасте до 3-х лет'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVChildFrom3To18',
                name: 'Ответы по анамнезу жизни для ребенка в возрасте от 3 до 18 лет'
            },
            {
                id: 'https://fhir.by/StructureDefinition/AVFisicalDevelopmentAdult',
                name: 'Ответы по физическому развитию взрослого пациента'
            },
            {
                id: 'https://fhir.by/StructureDefinition/QRTransfusiologyAnamnesis',
                name: 'Ответы по трансфузиологическому анамнезу'
            },
            {
                id: 'https://fhir.by/StructureDefinition/FamilyAnamnesisBY',
                name: 'Ответы по семейному анамнезу'
            }
        ]
    },
    {
        id: 'RelatedPerson',
        name: 'Представители и контактные лица',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/RelatedPersonPermanentBy',
                name: 'Законный представитель пациента'
            },
            {
                id: 'https://fhir.by/StructureDefinition/RelatedPersonTemporaryBy',
                name: 'Контактное лицо пациента'
            }
        ]
    },
    {
        id: 'Schedule',
        name: 'Расписания',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ScheduleBy',
                name: 'Расписание медицинских услуг'
            }
        ]
    },
    {
        id: 'ServiceRequest',
        name: 'Направления и запросы услуг',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestBy',
                name: 'Запрос медицинских услуг (абстрактный профиль)'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestHomeVisit',
                name: 'Вызов врача на дом'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestImmunization',
                name: 'Направление на вакцинацию'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestHospitalisation',
                name: 'Направление на госпитализацию'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestDispanserisation',
                name: 'Направление на диспансеризацию'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestConsult',
                name: 'Направление на консультацию, первичный или повторный прием специалиста'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestRadiotherapy',
                name: 'Направление на лучевую терапию'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestMedExam',
                name: 'Направление на медицинский осмотр работающего'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestBioMatCollection',
                name: 'Направление на процедуру взятия биологического материала'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestRadioisotope',
                name: 'Направление на радиоизотопное исследование'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestUltrasound',
                name: 'Направление на ультразвуковое исследование'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestPhysiotherapy',
                name: 'Направление на физиотерапевтическое лечение'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestEndoscopy',
                name: 'Направление на эндоскопическое исследование'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestImaging',
                name: 'Направление на визуальное исследование'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestBioMatResearch',
                name: 'Направление на исследование биологического материала'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestLab',
                name: 'Направление на лабораторные исследования, выполняемые в лаборатории'
            },
            {
                id: 'https://fhir.by/StructureDefinition/ServiceRequestFunctDiagn',
                name: 'Направление на функциональное исследование'
            }
        ]
    },
    {
        id: 'Slot',
        name: 'Слоты в расписании',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/SlotBy',
                name: 'Слот в расписании'
            }
        ]
    },
    {
        id: 'Specimen',
        name: 'Биологический материал',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/BioMatSpecimen',
                name: 'Образец биологического материала'
            },
            {
                id: 'https://fhir.by/StructureDefinition/SpecimenLab',
                name: 'Образец материала для лабораторного исследования'
            }
        ]
    },
    {
        id: 'Task',
        name: 'Задачи и требования',
        items: [
            {
                id: 'https://fhir.by/StructureDefinition/OrderingDocument',
                name: 'Заказ медицинских документов'
            }
        ]
    }
]

PROFILES.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
PROFILES.forEach(section => section.items.sort((a, b) => a.name.localeCompare(b.name, 'ru')));

export default PROFILES;