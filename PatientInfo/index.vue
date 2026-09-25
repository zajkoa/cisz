<template>
    <div class="card">
        <div class="card-body">
            <DBForm :store="store" ref="form">
                <template v-slot="form">
                    <div class="form-row">
                        <div class="col-lg-4">
                            <DBEdit :form="form" field="patient" typeahead />
                        </div>
                    </div>

                    <Tabs>
                        <Tab caption="Общая информация">
                            <div class="form-row border-bottom">
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="begin" />
                                </div>
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="end" />
                                </div>
                                <div class="col-auto mt-3">
                                    <button type="button" class="btn btn-save" @click="onFindInfo"> Поиск </button>
                                </div>
                            </div>

                            <ViewCISZ :resource="resource" :key="resource.id" v-if="resource.id"></ViewCISZ>
                        </Tab>

                        <Tab caption="Поиск по профилю">
                            <div class="form-row border-bottom">
                                <div class="col-lg-4">
                                    <DBEdit :form="form" field="section" clear />
                                </div>
                                <div class="col-lg-4">
                                    <DBEdit :form="form" field="profile" clear />
                                </div>
                                <div class="col-auto mt-3">
                                    <button type="button" class="btn btn-save" @click="onFindProfile"> Поиск </button>
                                </div>
                            </div>
                            <ViewCISZ :resource="profileResource" :key="profileResource.id" :hideTabs="true" v-if="Object.keys(profileResource).length > 0"></ViewCISZ>
                        </Tab>

                        <Tab caption="Направления на исследования">
                            <div class="form-row border-bottom">
                                <div class="col-lg-4">
                                    <DBEdit :form="form" field="profileDirection" clear />
                                </div>
                                <div class="col-lg-3">
                                    <DBEdit :form="form" field="contragent" selectMode />
                                </div>
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="authored" clear />
                                </div>
                                <div class="col-auto mt-3">
                                    <button type="button" class="btn btn-save" @click="onFindDirections">Поиск направлений</button>
                                </div>
                            </div>

                            <DBGrid :store="storeDirections" :config="configDirections" ref="gridDirections" readonly></DBGrid>
                        </Tab>
                    </Tabs>
                </template>
            </DBForm>
        </div>
    </div>
</template>

<script lang="jsx">
import dayjs from "dayjs";
import { reactive, ref } from 'vue';

import DBStore from '@/core/db_store';
import stateStore from "@/core/store/index";
import DBStoreRecord from '@/core/db_store_record';
import { query } from '@/core/components/DB/api';
import { toastError } from "@/core/helpers/toastify";
import { isRequired } from '@/core/helpers/validators';
import { clearObject } from '@/core/helpers/utils';
import { getStartPeriodConfig, getEndPeriodConfig } from '@/core/helpers/mixins';

import ViewCISZ from '../components/ViewCISZ/index.vue';
import { clientCISZ } from '../ClientCISZ';
import { findPatients, openReference } from '../index';
import { parseResource } from '../api';

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
];

PROFILES.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
PROFILES.forEach(section => section.items.sort((a, b) => a.name.localeCompare(b.name, 'ru')));

export default {
    components: {
        ViewCISZ
    },

    props: {
        defaults: {
            type: Object,
            default: () => ({})
        }
    },

    setup(props) {
        const client = clientCISZ();

        const gridDirections = ref(null);

        const resource = reactive({});

        const form = ref(null);

        const profileResource = reactive({}); 

        const store = new DBStoreRecord(
            'patient_info',
            {
                fields: {
                    patient: {
                        description: 'Пациент',
                        type: {
                            reference: 'patients'
                        },
                        validation: {
                            isRequired
                        },
                        config: {
                            typeahead: {
                                table: "patients",
                                notion: (data) => {
                                    let title = data.name;
                                    if (data.dateofbirth) title += ` (${dayjs(data.dateofbirth).format('DD.MM.YYYY')})`;
                                    if (data.personal_number) title += ` ${data.personal_number}`;

                                    const notion = [data.name];

                                    if (data.dateofbirth) notion.push(`<small>(${dayjs(data.dateofbirth).format('DD.MM.YYYY')})</small>`);
                                    if (data.personal_number) notion.push(`<small>${data.personal_number}</small>`);

                                    return {
                                        title,
                                        notion: `<div>${notion.join(' ')}</div>` + (data.address_p ? `<small>${data.address_p}</small>` : '')
                                    }
                                },
                                options: {
                                    fields: ['id', 'name', 'dateofbirth', 'address_p', 'personal_number', 'reference'],
                                    limit: 10
                                }
                            },
                            onSelect: async (data) => {
                                if (data) {
                                    store.data.reference = data.reference;
                                } else {
                                    store.data.reference = null;
                                }
                            }
                        }
                    },
                    reference: {
                        description: 'Ссылка',
                        type: 'STRING',
                    },
                    begin: {
                        description: 'Начало периода',
                        type: 'DATEONLY',
                        validation: {
                            isRequired
                        },
                        config: getStartPeriodConfig((controller) => controller.data.end)
                    },
                    end: {
                        description: 'Окончание периода',
                        type: 'DATEONLY',
                        validation: {
                            isRequired
                        },
                        config: getEndPeriodConfig((controller) => controller.data.begin)
                    },
                    contragent: {
                        description: 'Организация',
                        type: {
                            reference: 'contragents'
                        },
                        config: {
                            typeahead: {
                                options: {
                                    fields: ['id', 'name', 'reference'],
                                    limit: 10
                                }
                            },
                            onSelect: async (data) => {
                                if (data) {
                                    store.data.referenceContragent = data.reference;
                                } else {
                                    store.data.referenceContragent = null;
                                }
                            }
                        }
                    },
                    authored: {
                        description: 'Дата направления',
                        type: 'DATEONLY'
                    },
                    referenceContragent: {
                        description: 'Ссылка',
                        type: 'STRING'
                    },
                    profileDirection: {
                        description: 'Профиль',
                        validation: {
                            isRequired
                        },
                        type: {
                            enum: [
                                {
                                    id: "https://fhir.by/StructureDefinition/ServiceRequestBioMatResearch",
                                    name: "Направление на исследование биологического материала"
                                }
                            ]
                        }
                    },
                    section: {
                        description: 'Раздел',
                        validation: {
                            isRequired
                        },
                        type: {
                            enum: PROFILES
                        }
                    },
                    profile: {
                        description: "Профиль",
                        depends: 'section',
                        validation: {
                            isRequired
                        },
                        type: {
                            enum: 'items'
                        }
                    }
                }
            }
        );

        const getPatientInfo = async (patientRef) => {
            const { begin, end } = store.data;

            stateStore.state.load = true;
            try {
                const data = await client.request(`${patientRef}/$everything?start=${begin}&end=${end}`);

                await client.resolveDisplayNames(data, patientRef);

                Object.assign(resource, data);
            } catch (e) {
                console.error('Ошибка при получении данных пациента:', e);
            } finally {
                stateStore.state.load = false;
            }
        }

        const onFindInfo = async () => {
            const { patient } = store.data;

            clearObject(resource);

            if (await form.value.validation(false, ['section', 'profile', 'profileDirection'])) {
                const patientRef = store.data.reference;

                if (patientRef) {
                    await getPatientInfo(patientRef);
                } else {
                    const responsePatient = await query({
                        table: 'patients',
                        method: 'object',
                        data: { id: patient },
                        params: { fields: ['id', 'name', 'personal_number', 'dateofbirth'] }
                    });

                    if (responsePatient.complete) {
                        if (responsePatient.data) {
                            const { id, name, personal_number, dateofbirth } = responsePatient.data;

                            const result = await findPatients({ name, personal_number, dateofbirth }, true);

                            if (typeof result == 'object') {
                                if (result == null) {
                                    return null;
                                } else {
                                    await query({
                                        table: 'patients',
                                        method: 'save',
                                        data: { id, reference: result.reference }
                                    });

                                    await getPatientInfo(result.reference);
                                }
                            }
                        }
                    }
                }
            }
        }

        const configDirections = {
            key: 'id',
            menu: false,
            view: false,
            fields: {
                id: {
                    type: 'STRING',
                    config: {
                        hide: true
                    }
                },
                name: {
                    description: "Наименование",
                    type: 'STRING'
                },
                date_collect: {
                    description: "Дата направления",
                    type: 'DATEONLY'
                },
                location: {
                    description: "Отправитель",
                    type: 'STRING'
                },
                data: {
                    description: "Данные направления",
                    type: 'JSON',
                    config: {
                        hide: true
                    }
                },
                resource: {
                    description: "Ресурс",
                    type: 'JSON',
                    config: {
                        hide: true
                    }
                }
            },
            cellClick: {
                name: async (data) => {
                    const { id, resourceType, subject } = data.resource;

                    await openReference(`${subject.reference}/${resourceType}/${id}`);
                }
            }
        }

        const storeDirections = new DBStore('find_directions', configDirections);
        storeDirections.model.offLine = true;

        const onFindDirections = async () => {
            storeDirections.clear();

            if (await form.value.validation(false, ['section', 'profile'])) {
                const { reference, referenceContragent, authored, profileDirection } = store.data;

                if (profileDirection) {
                    if (reference) {
                        const params = {
                            "code-concept": "patho-histology",
                            _profile: profileDirection,
                            performer: `Organization/${client.organizationId}`,
                            status: "active"
                        }

                        if (referenceContragent) {
                            params['assigner'] = referenceContragent;
                        }

                        if (authored) {
                            params['authored'] = authored;
                        }

                        const { type, entry } = await client.request(`${reference}/ServiceRequest?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`);

                        if (type == 'searchset') {
                            for (const row of entry) {
                                const { resourceType } = row.resource;

                                if (resourceType == 'ServiceRequest') {
                                    const { location, requester, reason, specimen, subject } = row.resource;

                                    await client.loadReference(location);
                                    await client.loadReference(requester);
                                    await client.loadReference(subject);

                                    await client.loadReference(reason, subject.reference);
                                    await client.loadReference(specimen, subject.reference);

                                    const response = await parseResource(row.resource);

                                    if (response.complete) {
                                        const direction = {
                                            name: `Направление на исследование № ${response.data.data.number_direct}`,
                                            location: null,
                                            data: null,
                                            resource: row.resource
                                        }

                                        const responsePGINotion = await query({ table: 'pgi', method: 'notion', data: response.data.data });

                                        if (responsePGINotion.complete) {
                                            responsePGINotion.data.status = 2;

                                            direction.location = responsePGINotion.data._customer;
                                            direction.date_collect = responsePGINotion.data.date_collect;
                                            direction.data = responsePGINotion.data;
                                        }

                                        storeDirections.push(direction);
                                    } else {
                                        toastError(response.message);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        const onFindProfile = async () => {
            //6010203A001PB5
            //3140394E013PB4
            if (await form.value.validation(false, ['profileDirection'])) {
                const { reference, section, profile } = store.data;

                if (reference && section && profile) {
                    clearObject(profileResource);
                    stateStore.state.load = true;
                    
                    try {
                        const data = await client.request(`${reference}/${section}?_count=1000&_profile=${profile}`);

                        if (data && data.resourceType == 'Bundle') {
                            await client.resolveDisplayNames(data, reference);
                            
                            Object.assign(profileResource, data);                            
                        }
                    } catch (error) {
                        console.error(error);
                        console.log(error);
                        toastError("Ошибка при поиске по профилю");
                    } finally {
                        stateStore.state.load = false;
                    }
                }
            }
        }

        const { defaults } = props;

        store.loadData(defaults);

        return {
            form,
            store,
            onFindInfo,
            onFindProfile,
            onFindDirections,
            gridDirections,
            storeDirections,
            configDirections,
            resource,
            profileResource
        }
    }
}
</script>

<style></style>