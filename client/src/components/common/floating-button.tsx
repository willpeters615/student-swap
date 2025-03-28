import { Plus } from "lucide-react";
import { useModal } from "@/hooks/use-modal";
import { CreateListingModal } from "@/components/listings/create-listing-modal";

export default function FloatingButton() {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <>
      <div className="fixed bottom-24 right-4 sm:hidden z-10">
        <button 
          className="flex items-center justify-center w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          onClick={openModal}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      <CreateListingModal isOpen={isOpen} onClose={closeModal} />
    </>
  );
}
