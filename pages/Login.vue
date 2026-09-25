<script>
import { clientCISZ } from "../ClientCISZ";

export default {
    setup() {
        const client = clientCISZ();

        client.loginCallback();

        return () => null;
    }
}
</script>
