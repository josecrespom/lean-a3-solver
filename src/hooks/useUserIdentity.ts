// Nombre de quien usa la app en este equipo (autoría de los A3) y bienvenida.
import { useEffect, useRef, useState } from 'react';
import { getUserName, saveUserName } from '../storage/user';

const WELCOME_KEY = 'cms_a3_bienvenida_vista';

export function useUserIdentity() {
  const [userName, setUserNameState] = useState<string>(() => getUserName());
  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const askedNameRef = useRef(false);

  /** Guarda el nombre (y no se vuelve a preguntar en esta sesión) */
  const setUserName = (name: string) => {
    saveUserName(name);
    setUserNameState(name);
    userNameRef.current = name;
    askedNameRef.current = true;
  };

  /** Pide el nombre la primera vez que hace falta, si aún no se sabe */
  const askNameOnce = () => {
    if (!userNameRef.current && !askedNameRef.current) {
      askedNameRef.current = true;
      setIsUserModalOpen(true);
    }
  };

  /** Autor de los cambios (undefined si no se ha indicado nombre) */
  const author = () => userNameRef.current || undefined;

  // Bienvenida: solo la primera vez y a quien aún no ha indicado su nombre
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      return !getUserName() && localStorage.getItem(WELCOME_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const closeWelcome = () => {
    try {
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
    setShowWelcome(false);
  };

  return {
    userName,
    setUserName,
    author,
    askNameOnce,
    isUserModalOpen,
    openUserModal: () => setIsUserModalOpen(true),
    closeUserModal: () => setIsUserModalOpen(false),
    showWelcome,
    closeWelcome,
  };
}
