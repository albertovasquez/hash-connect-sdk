import { closeModal, closeModalDisconnect } from "../utils/modal";

export default function handleHashDisConnect(
    data: { address: string },
    onDisconnect: () => void
) {
    closeModalDisconnect();
    onDisconnect();
    closeModal();
}
