<template>
    <template v-if="parsed">
        <legend class="font-size-sm font-weight-bold" v-if="caption">{{ caption }}</legend>

        <div class="mt-1">
            <ViewCISZItem v-for="(item, key) of notion" :key="key" :item="item" :hideTabs="hideTabs" />
        </div>

        <a href="#" @click.prevent="onViewJSON" v-if="availableRole('admin')">Исходный JSON</a>
    </template>

    <div ref="jsonEditorRef" v-else></div>
</template>

<script>
import { createJSONEditor } from 'vanilla-jsoneditor';
import { onMounted, ref, defineComponent, onUnmounted, watch, h, computed } from 'vue';

import ViewJSON from '@/core/components/ViewJSON/index.vue';
import { openPanel } from "@/core/layouts";
import { onRenderValue } from '../../json_editor'
import { viewResource } from '../../api'
import { availableRole } from "@/core/helpers/access";

import ViewCISZItem from './ViewCISZItem.vue';

export default defineComponent({
    inheritAttrs: false,

    components: {
        ViewCISZItem
    },

    props: {
        resource: {
            type: Object,
            default: () => ({})
        },
        hideTabs: {
            type: Boolean,
            default: false
        }
    },

    setup(props) {
        const notion = ref([]);
        const caption = ref('');
        const parsed = ref(false);
        const jsonEditorRef = ref(null);

        let editor = null;

        const loadResource = async (resource) => {
            notion.value = [];

            const data = await viewResource(resource);
            if (data && data.length > 0) {
                caption.value = data.caption || '';

                data.forEach((el) => notion.value.push(el));

                parsed.value = true;
            } else {
                if (editor) editor.set({ json: resource });
                parsed.value = false;
            }
        }

        onMounted(async () => {
            editor = createJSONEditor({
                target: jsonEditorRef.value,
                props: {
                    mode: 'tree',
                    readOnly: true,
                    onRenderValue
                }
            })

            watch(
                () => props.resource,
                (value) => loadResource(value),
                {
                    deep: true,
                    immediate: true
                }
            )
        })

        onUnmounted(() => {
            if (editor) {
                editor.destroy();
                editor = null;
            }
        })

        const onViewJSON = () => {
            openPanel({
                caption: 'JSON',
                onCreate: (panel) => {
                    return {
                        component: h(ViewJSON, {
                            data: props.resource,
                            onRenderValue: onRenderValue
                        })
                    }
                }
            })
        }

        return {
            notion,
            parsed,
            caption,
            jsonEditorRef,
            availableRole,
            onViewJSON,
            hideTabs: computed(() => props.hideTabs)
        }
    }
})
</script>

<style></style>