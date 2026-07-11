import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ExternalLink, RefreshCw } from "lucide-react";

const EMPTY_FORM = {
  state_code: "",
  state_name: "",
  portal_url: "",
  portal_name: "",
  portal_note: "",
  is_active: true,
};

export default function AdminDataSources() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const records = await base44.entities.DataSourceConfig.list("state_code", 200);
      setConfigs(records);
    } catch (err) {
      console.error("Failed to load configs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (config) => {
    setForm({
      state_code: config.state_code || "",
      state_name: config.state_name || "",
      portal_url: config.portal_url || "",
      portal_name: config.portal_name || "",
      portal_note: config.portal_note || "",
      is_active: config.is_active !== false,
    });
    setEditingId(config.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this data source config?")) return;
    try {
      await base44.entities.DataSourceConfig.delete(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleSave = async () => {
    if (!form.state_code.trim() || !form.portal_url.trim()) {
      alert("State code and Portal URL are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, state_code: form.state_code.toUpperCase().trim() };
      if (editingId) {
        await base44.entities.DataSourceConfig.update(editingId, payload);
      } else {
        await base44.entities.DataSourceConfig.create(payload);
      }
      setDialogOpen(false);
      await loadConfigs();
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (config) => {
    try {
      await base44.entities.DataSourceConfig.update(config.id, { is_active: !config.is_active });
      setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err) {
      alert("Failed to toggle: " + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Data Source Config</h1>
          <p className="text-sm text-slate-500 mt-1">Manage portal URLs for states without live API integrations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConfigs} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Source
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No data source configs yet. Click "Add Source" to create one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">State</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Portal URL</TableHead>
                <TableHead className="w-20">Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-bold text-slate-800">{config.state_code}</TableCell>
                  <TableCell className="text-sm text-slate-600">{config.state_name}</TableCell>
                  <TableCell>
                    <a href={config.portal_url} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 max-w-xs truncate">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{config.portal_url}</span>
                    </a>
                  </TableCell>
                  <TableCell>
                    <Switch checked={config.is_active !== false} onCheckedChange={() => handleToggle(config)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(config)} aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)} aria-label="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Data Source" : "Add Data Source"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state_code">State Code *</Label>
                <Input id="state_code" value={form.state_code} onChange={e => setForm(f => ({ ...f, state_code: e.target.value }))} placeholder="OR" maxLength={2} />
              </div>
              <div>
                <Label htmlFor="state_name">State Name</Label>
                <Input id="state_name" value={form.state_name} onChange={e => setForm(f => ({ ...f, state_name: e.target.value }))} placeholder="Oregon" />
              </div>
            </div>
            <div>
              <Label htmlFor="portal_url">Portal URL *</Label>
              <Input id="portal_url" value={form.portal_url} onChange={e => setForm(f => ({ ...f, portal_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="portal_name">Portal Name</Label>
              <Input id="portal_name" value={form.portal_name} onChange={e => setForm(f => ({ ...f, portal_name: e.target.value }))} placeholder="Oregon HealthSpace Portal" />
            </div>
            <div>
              <Label htmlFor="portal_note">Portal Note</Label>
              <Textarea id="portal_note" value={form.portal_note} onChange={e => setForm(f => ({ ...f, portal_note: e.target.value }))}
                placeholder="Context note shown to users..." className="min-h-[80px]" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}