import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Firebase User object
    const [userData, setUserData] = useState(null); // Firestore User Data (role, etc.)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUser = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Real-time listener for user document
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setUserData(doc.data());
                    }
                    setLoading(false);
                });
            } else {
                setUser(null);
                setUserData(null);
                if (unsubscribeUser) {
                    unsubscribeUser();
                    unsubscribeUser = null;
                }
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email, password, role, metadata = {}) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Assign default avatar based on gender/name
        const nameForAvatar = metadata.name || email.split('@')[0];
        let defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random&color=fff`;

        if (metadata.gender === 'Male') {
            defaultAvatar = 'https://avatar.iran.liara.run/public/boy';
        } else if (metadata.gender === 'Female') {
            defaultAvatar = 'https://avatar.iran.liara.run/public/girl';
        }

        const userDataToSave = {
            email: user.email,
            role: role,
            name: metadata.name || '',
            college: metadata.college || '',
            gender: metadata.gender || 'Not Specified',
            avatarUrl: defaultAvatar,
            createdAt: new Date(),
        };

        // Create user document with role and metadata
        await setDoc(doc(db, 'users', user.uid), userDataToSave);

        // Manually set userData for immediate feedback
        setUserData(userDataToSave);

        return user;
    };

    const logout = () => {
        return firebaseSignOut(auth);
    };

    const updateUserPassword = async (newPassword) => {
        if (!auth.currentUser) throw new Error("No user logged in");
        const { updatePassword } = await import('firebase/auth');
        return updatePassword(auth.currentUser, newPassword);
    };

    const deleteUserAccount = async () => {
        if (!auth.currentUser) throw new Error("No user logged in");
        const { deleteUser } = await import('firebase/auth');
        const { deleteDoc, doc } = await import('firebase/firestore');

        const uid = auth.currentUser.uid;
        await deleteDoc(doc(db, 'users', uid));
        return deleteUser(auth.currentUser);
    };

    return (
        <AuthContext.Provider value={{ user, userData, loading, login, signup, logout, updateUserPassword, deleteUserAccount }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
