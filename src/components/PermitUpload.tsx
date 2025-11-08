import React, { useState, useCallback } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface PermitFile {
  id: string;
  file: File;
  permitType: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
}

interface PermitUploadProps {
  userId: string;
  destinationId: string;
  onPermitsUploaded: () => void;
}

const permitTypes = [
  { value: 'business_permit', label: 'Business Permit', required: true },
  { value: 'tourism_permit', label: 'Tourism Permit', required: false },
  { value: 'environmental_clearance', label: 'Environmental Clearance', required: false },
  { value: 'fire_safety', label: 'Fire Safety Certificate', required: true },
  { value: 'health_permit', label: 'Health Permit (for F&B)', required: true },
  { value: 'other', label: 'Other Permits', required: false }
];

export const PermitUpload: React.FC<PermitUploadProps> = ({ userId, destinationId, onPermitsUploaded }) => {
  const [permits, setPermits] = useState<PermitFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files)); }, []);
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFiles(Array.from(e.target.files)); };

  const handleFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 10 * 1024 * 1024;
      if (!validTypes.includes(file.type)) { toast({ title: "Invalid file type", variant: "destructive" }); return false; }
      if (file.size > maxSize) { toast({ title: "File too large", variant: "destructive" }); return false; }
      return true;
    });
    const newPermits: PermitFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file, permitType: '', status: 'pending' as const
    }));
    setPermits(prev => [...prev, ...newPermits]);
  };

  const updatePermitType = (permitId: string, type: string) => { setPermits(prev => prev.map(p => p.id === permitId ? { ...p, permitType: type } : p)); };
  const removePermit = (permitId: string) => { setPermits(prev => prev.filter(p => p.id !== permitId)); };

  const uploadPermits = async () => {
    const permitsToUpload = permits.filter(p => p.permitType && (p.status === 'pending' || p.status === 'error'));
    if (permitsToUpload.length === 0) { toast({ title: "No new permits to upload", variant: "destructive" }); return; }
    const requiredPermitTypes = permitTypes.filter(type => type.required).map(type => type.value);
    const uploadedPermitTypes = permits.filter(p => p.permitType).map(p => p.permitType);
    const missingRequired = requiredPermitTypes.filter(type => !uploadedPermitTypes.includes(type));
    if (missingRequired.length > 0) {
      toast({ title: "Missing Required Permits", description: `Please select a type for all uploaded files and ensure all required permits are included.`, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const successfulUploads = [];
    const failedUploads = [];

    for (const permit of permitsToUpload) {
      try {
        setPermits(prev => prev.map(p => p.id === permit.id ? { ...p, status: 'uploading' } : p));
        const fileExt = permit.file.name.split('.').pop();
        const fileName = `${permit.permitType}-${Date.now()}.${fileExt}`;
        
        // --- THIS IS THE CORRECTED, SIMPLIFIED FILE PATH ---
        const filePath = `${destinationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('permits').upload(filePath, permit.file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('permits').getPublicUrl(filePath);
        await supabase.from('destination_permits').insert({
          destination_id: destinationId, user_id: userId, permit_type: permit.permitType,
          file_url: publicUrl, file_name: permit.file.name
        });

        setPermits(prev => prev.map(p => p.id === permit.id ? { ...p, status: 'success', url: publicUrl } : p));
        successfulUploads.push(permit);
      } catch (error) {
        console.error('Upload failed for:', permit.file.name, error);
        failedUploads.push(permit);
        setPermits(prev => prev.map(p => p.id === permit.id ? { ...p, status: 'error' } : p));
      }
    }

    setIsUploading(false);
    if (failedUploads.length > 0) {
      toast({ title: "Some uploads failed", description: "Please review and retry the failed items.", variant: "destructive" });
    }
    if (successfulUploads.length > 0 && failedUploads.length === 0) {
      toast({ title: "Success!", description: "All permits have been uploaded." });
      onPermitsUploaded();
    }
  };

  const getFileIcon = (fileType: string) => { if (fileType.includes('pdf')) return '📄'; if (fileType.includes('image')) return '🖼️'; return '📎'; };
  const pendingOrFailedPermits = permits.filter(p => p.status === 'pending' || p.status === 'error');

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Permit Verification Documents</CardTitle>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Upload all required permits. Once uploaded, you can submit to complete your registration.</AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted'}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="text-lg font-medium">Upload Permit Documents</h4>
          <p className="text-muted-foreground mb-4">Drag & drop files or click to browse</p>
          <Input id="permit-upload-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileInput} className="hidden" />
          <Label htmlFor="permit-upload-input"><Button type="button" variant="outline" asChild><span>Choose Files</span></Button></Label>
        </div>
        {permits.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Documents to be Uploaded:</h4>
            {permits.map(permit => (
              <div key={permit.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <span className="text-2xl">{getFileIcon(permit.file.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{permit.file.name}</p>
                  <p className="text-sm text-muted-foreground">{(permit.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={permit.permitType} onValueChange={(value) => updatePermitType(permit.id, value)} disabled={permit.status !== 'pending'}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Select permit type..." /></SelectTrigger>
                    <SelectContent>{permitTypes.map(type => (<SelectItem key={type.value} value={type.value}>{type.label} {type.required && '*'}</SelectItem>))}</SelectContent>
                  </Select>
                  {permit.status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                  {permit.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {permit.status === 'error' && <AlertCircle className="w-5 h-5 text-destructive" title="Upload Failed" />}
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => removePermit(permit.id)} disabled={permit.status === 'success'}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {permits.length > 0 && (
          <Button onClick={uploadPermits} disabled={isUploading || pendingOrFailedPermits.length === 0} className="w-full">
            {isUploading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>) : `Submit ${pendingOrFailedPermits.length} Document(s)`}
          </Button>
        )}
      </CardContent>
    </>
  );
};
