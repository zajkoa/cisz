<template>
    <iframe id="myFrame" width="100%" height="1050" frameborder="0"></iframe>
</template>

<script>
import { defineComponent, onMounted } from 'vue';
import { clientCISZ } from '../../ClientCISZ';

export default defineComponent({
    props: {
        html: {
            type: String,
            default: ''
        }
    },

    setup(props) {
        const client = clientCISZ();

        onMounted(async () => {
            try {
                const data = await client.request(props.html, { headers: { Accept: "text/html" } });

                const doc = document.getElementById('myFrame').contentDocument;
                doc.open();
                doc.write(data);
                doc.close();
            } catch (error) {

            }
        })

        return {}
    }
})
</script>
