import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { UserRound } from 'lucide-react';
import { buttonClass } from './ui/Button';
import { fieldClass } from './ui/fields';

interface UserNameModalProps {
  isOpen: boolean;
  initialName: string;
  onSave: (name: string) => void;
  onSkip: () => void;
}

/** Pide el nombre de la persona para registrar quién crea y modifica cada A3. */
export const UserNameModal: React.FC<UserNameModalProps> = ({ isOpen, initialName, onSave, onSkip }) => {
  const [name, setName] = useState(initialName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      closeLabel="Ahora no"
      maxWidth="max-w-sm"
      icon={<UserRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      title="¿Cómo te llamas?"
      description="Se usa para que el equipo vea quién ha creado o cambiado cada A3. Solo se pregunta una vez en este equipo."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
      >
        <input
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre y apellido"
          aria-label="Tu nombre"
          className={fieldClass('md', 'w-full')}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onSkip} className={buttonClass('ghost', 'md')}>
            Ahora no
          </button>
          <button type="submit" disabled={!name.trim()} className={buttonClass('primary', 'md')}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};
