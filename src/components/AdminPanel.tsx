import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Trash2, Shield, ShieldCheck, Users } from 'lucide-react';

interface ApprovedEmail {
    id: string;
    email: string;
    is_admin: boolean;
    created_at: string;
}

interface AdminPanelProps {
    onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
    const { user } = useAuth();
    const [emails, setEmails] = useState<ApprovedEmail[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const fetchEmails = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('approved_emails')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            setError('Failed to load approved emails');
            console.error(error);
        } else {
            setEmails(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const addEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsAdding(true);
        setError(null);

        const { error } = await supabase
            .from('approved_emails')
            .insert({ email: newEmail.trim().toLowerCase(), is_admin: false });

        if (error) {
            if (error.code === '23505') {
                setError('This email is already approved');
            } else {
                setError('Failed to add email');
                console.error(error);
            }
        } else {
            setNewEmail('');
            fetchEmails();
        }
        setIsAdding(false);
    };

    const removeEmail = async (id: string, email: string) => {
        if (email === user?.email) {
            setError("You cannot remove your own email");
            return;
        }

        const { error } = await supabase
            .from('approved_emails')
            .delete()
            .eq('id', id);

        if (error) {
            setError('Failed to remove email');
            console.error(error);
        } else {
            fetchEmails();
        }
    };

    const toggleAdmin = async (id: string, email: string, currentStatus: boolean) => {
        if (email === user?.email) {
            setError("You cannot change your own admin status");
            return;
        }

        const { error } = await supabase
            .from('approved_emails')
            .update({ is_admin: !currentStatus })
            .eq('id', id);

        if (error) {
            setError('Failed to update admin status');
            console.error(error);
        } else {
            fetchEmails();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Admin Panel</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add Email Form */}
                <form onSubmit={addEmail} className="p-4 border-b">
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Enter email to approve..."
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border bg-muted/50 focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={isAdding || !newEmail.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 mt-2">{error}</p>
                    )}
                </form>

                {/* Email List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="text-center text-muted-foreground py-8">
                            Loading...
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No approved emails yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {emails.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {item.is_admin ? (
                                            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                                        ) : (
                                            <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <span className="truncate text-sm">{item.email}</span>
                                        {item.email === user?.email && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => toggleAdmin(item.id, item.email, item.is_admin)}
                                            disabled={item.email === user?.email}
                                            className={`p-2 rounded-lg transition-colors ${item.is_admin
                                                    ? 'text-primary hover:bg-primary/10'
                                                    : 'text-muted-foreground hover:bg-muted'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            title={item.is_admin ? 'Remove admin' : 'Make admin'}
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => removeEmail(item.id, item.email)}
                                            disabled={item.email === user?.email}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Remove access"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t text-xs text-muted-foreground">
                    <ShieldCheck className="w-3 h-3 inline mr-1" />
                    Admin users can manage this list
                </div>
            </div>
        </div>
    );
}
