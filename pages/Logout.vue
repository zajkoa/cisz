<script>
import { onMounted } from "vue";

export default {
    setup() {
        onMounted(() => {
            const path = localStorage.getItem('cisz_path');

            localStorage.removeItem('cisz_unp');
            localStorage.removeItem('cisz_exp');
            localStorage.removeItem('cisz_path');
            localStorage.removeItem('cisz_access_token');
            localStorage.removeItem('cisz_refresh_token');
            localStorage.removeItem('cisz_organization_id');
            localStorage.removeItem('cisz_practitioner_id');
            localStorage.removeItem('cisz_practitioner_role');

            window.location.href = path;
        })

        return () => null;
    }
}
</script>
