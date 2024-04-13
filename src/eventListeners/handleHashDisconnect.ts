import { closeModal, closeModalDisconnect } from "../utils/modal";

export default function handleHashConnect(
    data: { address: string },
    onDisconnect: () => void
) {
    closeModalDisconnect();
    onDisconnect();
    closeModal();
}
