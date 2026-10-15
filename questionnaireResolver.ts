export interface QuestionnaireInfo {
    title: string;
    questions: Map<string, string>;
}

const questionnaireCache = new Map<string, QuestionnaireInfo>();

export function getQuestionnaireJsonUrl(canonicalUrl: string): string | null {
    if (!canonicalUrl || typeof canonicalUrl !== 'string') return null;

    const clean = canonicalUrl.split('|')[0].replace(/\.json$/i, '');
    const id = clean.split('/').pop();

    return id ? `https://fhir.by/Questionnaire-${id}.json` : null;
}

function extractQuestions(items: any[], map: Map<string, string>) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
        if (item.linkId && item.text) {
            map.set(String(item.linkId), item.text);
        }
        if (item.item && Array.isArray(item.item)) {
            extractQuestions(item.item, map);
        }
    }
}

export async function fetchQuestionnaire(canonicalUrl: string): Promise<QuestionnaireInfo> {
    if (!canonicalUrl || typeof canonicalUrl !== 'string') {
        return { title: '', questions: new Map() };
    }

    if (questionnaireCache.has(canonicalUrl)) {
        return questionnaireCache.get(canonicalUrl)!;
    }

    const questions = new Map<string, string>();
    let title = '';

    const targetUrl = getQuestionnaireJsonUrl(canonicalUrl);

    if (targetUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            let res = await fetch(targetUrl, {
                signal: controller.signal,
                headers: { Accept: 'application/json' }
            });

            if (!res.ok) {
                const [cleanUrl] = canonicalUrl.split('|');
                if (cleanUrl !== targetUrl) {
                    res = await fetch(cleanUrl, {
                        signal: controller.signal,
                        headers: { Accept: 'application/json' }
                    });
                }
            }

            if (res.ok) {
                const data: any = await res.json();
                if (data) {
                    title = data.title || data.name || '';
                    if (data.item) {
                        extractQuestions(data.item, questions);
                    }
                }
            }
        } catch (error: any) {
            console.warn(`[fetchQuestionnaire] Не удалось загрузить опросник ${targetUrl}:`, error.message);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    const result: QuestionnaireInfo = { title, questions };
    questionnaireCache.set(canonicalUrl, result);
    return result;
}

function fillItemTexts(items: any[], questions: Map<string, string>) {
    if (!Array.isArray(items)) return;

    for (const it of items) {
        if (it.linkId && !it.text) {
            const qText = questions.get(String(it.linkId));
            if (qText) {
                it.text = qText;
            }
        }

        if (Array.isArray(it.item)) {
            fillItemTexts(it.item, questions);
        }

        if (Array.isArray(it.answer)) {
            for (const ans of it.answer) {
                if (Array.isArray(ans.item)) {
                    fillItemTexts(ans.item, questions);
                }
            }
        }
    }
}

export async function enrichQuestionnaireResponse(resource: any): Promise<void> {
    if (!resource || resource.resourceType !== 'QuestionnaireResponse') return;
    if (!resource.questionnaire) return;

    const qInfo = await fetchQuestionnaire(resource.questionnaire);

    if (qInfo.title && !resource._questionnaireTitle) {
        resource._questionnaireTitle = qInfo.title;
    }

    if (qInfo.questions.size > 0 && Array.isArray(resource.item)) {
        fillItemTexts(resource.item, qInfo.questions);
    }
}

export async function resolveQuestionnaires(data: any): Promise<void> {
    if (!data || typeof data !== 'object') return;

    if (Array.isArray(data)) {
        for (const item of data) {
            await resolveQuestionnaires(item);
        }
        return;
    }

    if (data.resourceType === 'QuestionnaireResponse') {
        await enrichQuestionnaireResponse(data);
        return;
    }

    if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
        for (const e of data.entry) {
            const res = e.resource || e.item?.resource;
            if (res) {
                await resolveQuestionnaires(res);
            }
        }
    }
}