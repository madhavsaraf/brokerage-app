import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb9DlabhFjQnyzL64QQbdYi-Eerk2Jif0",
  authDomain: "brokerage-received.firebaseapp.com",
  projectId: "brokerage-received",
  storageBucket: "brokerage-received.firebasestorage.app",
  messagingSenderId: "113932197009",
  appId: "1:113932197009:web:546a681f613759a09cb330",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SOURCES = [
  "Saraf Agencies",
  "Rajeev Saraf",
  "Suman Saraf",
  "Madhav Saraf",
];

export default function EntryApp() {
  const [newEntry, setNewEntry] = useState({
    name: "",
    source: SOURCES[0],
    amount: "",
    date: new Date().toISOString().split("T")[0],
    received: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEntry((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "brokerageEntries"), {
        ...newEntry,
        amount: parseFloat(newEntry.amount),
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setNewEntry({
        name: "",
        source: SOURCES[0],
        amount: "",
        date: new Date().toISOString().split("T")[0],
        received: false,
      });
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      alert("Error adding entry: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-screen bg-blue-50 flex items-center justify-center">
      <div className="w-full h-full flex items-center justify-center">
        <form
          onSubmit={handleAddEntry}
          className="w-full max-w-xl bg-white p-10 m-6 rounded-xl shadow-xl border border-blue-100 space-y-6"
        >
          <h1 className="text-2xl font-bold text-black text-center mb-3">
            Add New Entry
          </h1>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={newEntry.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 bg-blue-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Source
            </label>
            <select
              name="source"
              value={newEntry.source}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-blue-50 text-blue-900"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Amount (INR)
            </label>
            <input
              type="number"
              name="amount"
              value={newEntry.amount}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-blue-900 bg-blue-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={newEntry.date}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-blue-50 text-blue-900"
            />
          </div>
          <div className="flex items-center pt-2">
            <input
              id="received"
              name="received"
              type="checkbox"
              checked={newEntry.received}
              onChange={handleInputChange}
              className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="received"
              className="ml-3 text-sm text-blue-800 font-medium"
            >
              Mark as received
            </label>
          </div>
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>
          {success && (
            <p className="text-green-600 text-center font-medium">
              Entry added!
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
