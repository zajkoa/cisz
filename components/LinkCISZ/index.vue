<template>
    <a href="#" @click.prevent="onClick" :title="reference">{{ label ? label : reference }}</a>
</template>

<script>
import { defineComponent } from 'vue';
import { openReference } from '../../index';

export default defineComponent({
    props: {
        label: {
            type: String,
            default: ''
        },
        reference: {
            type: String,
            default: ''
        },
        html: {
            type: Boolean,
            default: false
        }
    },

    setup(props) {
        const onClick = async () => {
            if (props.reference) {
                await openReference(props.reference, props.html);
            }
        };

        return {
            onClick
        }
    }
})
</script>
