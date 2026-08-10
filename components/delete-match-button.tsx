"use client";

type DeleteMatchButtonProps = {
  matchId: number;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function DeleteMatchButton({
  matchId,
  deleteAction,
}: DeleteMatchButtonProps) {
  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const confirmed = window.confirm(
      "Möchtest du dieses Spiel wirklich löschen? Zugehörige Tipps werden ebenfalls gelöscht."
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={deleteAction}
      onSubmit={handleSubmit}
    >
      <input
        type="hidden"
        name="matchId"
        value={matchId}
      />

      <button
        type="submit"
        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
      >
        Spiel löschen
      </button>
    </form>
  );
}