import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper to get animated avatar from Dicebear
export const getDefaultAvatar = (name, gender) => {
    const seed = encodeURIComponent(name || 'User');
    // Male (short hair), Female (long hair), Other (default)
    if (gender === 'Male') {
        return `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&hair=short&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    } else if (gender === 'Female') {
        return `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&hair=long&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    }
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

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


        const userDataToSave = {
            email: user.email,
            role: role,
            name: metadata.name || '',
            college: metadata.college || '',
            gender: metadata.gender || 'Not Specified',
            avatarUrl: getDefaultAvatar(metadata.name || email.split('@')[0], metadata.gender),
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
        <AuthContext.Provider value={{ user, userData, loading, login, signup, logout, updateUserPassword, deleteUserAccount, getDefaultAvatar }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
