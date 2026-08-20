'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box, Button, Chip, Divider, IconButton, Paper, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import KitchenIcon from '@mui/icons-material/Kitchen';
import {
  getProperties, getBeds, getBedrooms, getResidents,
  createBedroom, updateBedroom, deleteBedroom,
  createBed, updateBed, deleteBed,
  getPropertySpaces, createPropertySpace, updatePropertySpace, deletePropertySpace,
  createSpaceItem, updateSpaceItem, deleteSpaceItem,
  updateResident, createResident,
  Bed, Bedroom, Property, PropertySpace, SpaceItem, Resident, SPACE_CATEGORY_LABELS,
} from '@/services/api';
import BedroomDialog from '@/components/crud/BedroomDialog';
import BedDialog from '@/components/crud/BedDialog';
import PropertySpaceDialog from '@/components/crud/PropertySpaceDialog';
import SpaceItemDialog from '@/components/crud/SpaceItemDialog';
import ResidentDialog from '@/components/crud/ResidentDialog';
import ConfirmDialog from '@/components/crud/ConfirmDialog';
import { useRole } from '@/hooks/useRole';

type BedFormState = Omit<Bed, 'id' | 'propertyCode' | 'activeBooking'>;

function StatusChip({ status }: { status: 'vacant' | 'allocated' }) {
  return (
    <Chip
      label={status === 'allocated' ? 'Allocated' : 'Vacant'}
      size="small"
      sx={{
        bgcolor: status === 'allocated' ? '#DE9151' : '#4caf50',
        color: 'white', fontWeight: 600, fontSize: 11,
      }}
    />
  );
}

function ConditionChip({ condition }: { condition: string | null }) {
  if (!condition) return null;
  const color: Record<string, string> = {
    Good: '#4caf50', Fair: '#ff9800', Poor: '#f44336', Missing: '#9e9e9e',
  };
  return (
    <Chip
      label={condition} size="small"
      sx={{ bgcolor: color[condition] ?? '#9e9e9e', color: 'white', fontWeight: 600, fontSize: 11 }}
    />
  );
}

export default function InventoryPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params?.id ?? '';
  const { can } = useRole();

  const [property, setProperty] = useState<Property | null>(null);
  const [bedrooms, setBedrooms] = useState<Bedroom[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [spaces, setSpaces] = useState<PropertySpace[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  // Bedroom dialog state
  const [bedroomDialogOpen, setBedroomDialogOpen] = useState(false);
  const [editingBedroom, setEditingBedroom] = useState<Bedroom | null>(null);
  const [deleteBedroomId, setDeleteBedroomId] = useState<string | null>(null);

  // Bed dialog state
  const [bedDialogOpen, setBedDialogOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [bedDefaultValues, setBedDefaultValues] = useState<{ propertyId?: string; bedroomId?: string }>({});
  const [deleteBedId, setDeleteBedId] = useState<string | null>(null);

  // Space dialog state
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<PropertySpace | null>(null);
  const [deleteSpaceId, setDeleteSpaceId] = useState<string | null>(null);

  // Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SpaceItem | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string>('');
  const [deleteItemInfo, setDeleteItemInfo] = useState<{ spaceId: string; itemId: string } | null>(null);

  // Resident dialog state (opened via double-click on a bed's resident)
  const [residentDialogOpen, setResidentDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  const load = async () => {
    const [props, brs, bds, sps, rs] = await Promise.all([
      getProperties(),
      getBedrooms(propertyId),
      getBeds(propertyId),
      getPropertySpaces(propertyId),
      getResidents(),
    ]);
    setAllProperties(props);
    setProperty(props.find(p => p.id === propertyId) ?? null);
    setBedrooms(brs);
    setBeds(bds);
    setSpaces(sps);
    setResidents(rs);
  };

  useEffect(() => {
    if (propertyId) load();
  }, [propertyId]);

  const handleSaveBedroom = async (name: string, id?: string) => {
    if (id) await updateBedroom(id, { name });
    else await createBedroom({ propertyId, name });
    await load();
  };

  const handleDeleteBedroom = async () => {
    if (!deleteBedroomId) return;
    await deleteBedroom(deleteBedroomId);
    setDeleteBedroomId(null);
    await load();
  };

  const handleSaveBed = async (data: BedFormState, id?: string) => {
    if (id) await updateBed(id, data);
    else await createBed(data);
    await load();
  };

  const handleDeleteBed = async () => {
    if (!deleteBedId) return;
    await deleteBed(deleteBedId);
    setDeleteBedId(null);
    await load();
  };

  const handleSaveSpace = async (data: { category: string; name: string }, id?: string) => {
    if (id) await updatePropertySpace(id, data as Partial<PropertySpace>);
    else await createPropertySpace({ propertyId, ...data });
    await load();
  };

  const handleDeleteSpace = async () => {
    if (!deleteSpaceId) return;
    await deletePropertySpace(deleteSpaceId);
    setDeleteSpaceId(null);
    await load();
  };

  const handleSaveItem = async (data: Omit<SpaceItem, 'id' | 'spaceId'>, id?: string) => {
    if (id) await updateSpaceItem(activeSpaceId, id, data);
    else await createSpaceItem(activeSpaceId, data);
    await load();
  };

  const handleDeleteItem = async () => {
    if (!deleteItemInfo) return;
    await deleteSpaceItem(deleteItemInfo.spaceId, deleteItemInfo.itemId);
    setDeleteItemInfo(null);
    await load();
  };

  const openAddBed = (bedroomId?: string) => {
    setEditingBed(null);
    setBedDefaultValues({ propertyId, bedroomId });
    setBedDialogOpen(true);
  };

  const openEditBed = (bed: Bed) => {
    setEditingBed(bed);
    setBedDefaultValues({});
    setBedDialogOpen(true);
  };

  const residentMap = new Map(residents.map(r => [r.id, r]));
  const bedsForBedroom = (bedroomId: string) => beds.filter(b => b.bedroomId === bedroomId);
  const unassignedBeds = beds.filter(b => !b.bedroomId);

  const BedTable = ({ rows }: { rows: Bed[] }) => (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#FFF0E6', py: 0.75 } }}>
          <TableCell>Bed #</TableCell>
          <TableCell>Resident</TableCell>
          <TableCell>Location</TableCell>
          <TableCell>Pos.</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Sex</TableCell>
          <TableCell>Size</TableCell>
          <TableCell align="right">Rent (€)</TableCell>
          <TableCell align="right">Deposit (€)</TableCell>
          <TableCell>Status</TableCell>
          {can('bed:write') && <TableCell align="right" />}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={11} align="center" sx={{ py: 2, color: 'text.secondary' }}>
              No beds yet
            </TableCell>
          </TableRow>
        ) : rows.map(bed => {
          const resident = bed.activeBooking?.residentId ? residentMap.get(bed.activeBooking.residentId) : null;
          const residentName = resident?.fullName ?? '—';
          return (
            <TableRow key={bed.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {bed.propertyCode ?? ''}-{bed.bedNumber}
              </TableCell>
              <TableCell
                onDoubleClick={() => {
                  if (!resident) return;
                  setEditingResident(resident);
                  setResidentDialogOpen(true);
                }}
                sx={{
                  fontWeight: residentName !== '—' ? 500 : 400,
                  color: residentName === '—' ? 'text.secondary' : 'inherit',
                  cursor: resident ? 'pointer' : 'default',
                }}
              >
                {residentName}
              </TableCell>
              <TableCell>{bed.name ?? '—'}</TableCell>
              <TableCell>{bed.position ?? '—'}</TableCell>
              <TableCell>{bed.bedroomType}</TableCell>
              <TableCell>{bed.sex}</TableCell>
              <TableCell>{bed.bedSize}</TableCell>
              <TableCell align="right">{bed.rentAmount}</TableCell>
              <TableCell align="right">{bed.depositAmount}</TableCell>
              <TableCell><StatusChip status={bed.status} /></TableCell>
              {can('bed:write') && (
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" onClick={() => openEditBed(bed)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteBedId(bed.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const ItemTable = ({ space }: { space: PropertySpace }) => (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#f5f5f5', py: 0.75 } }}>
          <TableCell>Item</TableCell>
          <TableCell align="center">Qty</TableCell>
          <TableCell>Condition</TableCell>
          <TableCell>Notes</TableCell>
          {can('property:write') && <TableCell align="right" />}
        </TableRow>
      </TableHead>
      <TableBody>
        {!space.items?.length ? (
          <TableRow>
            <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
              No items yet
            </TableCell>
          </TableRow>
        ) : space.items.map(item => (
          <TableRow key={item.id} hover>
            <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
            <TableCell align="center">{item.quantity}</TableCell>
            <TableCell><ConditionChip condition={item.condition} /></TableCell>
            <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{item.notes ?? '—'}</TableCell>
            {can('property:write') && (
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <IconButton size="small" onClick={() => {
                  setEditingItem(item);
                  setActiveSpaceId(space.id);
                  setItemDialogOpen(true);
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() =>
                  setDeleteItemInfo({ spaceId: space.id, itemId: item.id })
                }>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton component={Link} href="/properties" size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {property ? `${property.code} — Inventory` : 'Inventory'}
          </Typography>
          {property?.fullAddress && (
            <Typography variant="body2" color="text.secondary">{property.fullAddress}</Typography>
          )}
        </Box>
      </Box>

      {/* ── Bed Inventory ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MeetingRoomIcon sx={{ color: '#DE9151' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Bed Inventory</Typography>
          <Typography variant="body2" color="text.secondary">
            {bedrooms.length} bedroom{bedrooms.length !== 1 ? 's' : ''} · {beds.length} bed{beds.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {can('property:write') && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => openAddBed(undefined)}>
              Add Bed
            </Button>
            <Button
              variant="contained" size="small" startIcon={<MeetingRoomIcon />}
              onClick={() => { setEditingBedroom(null); setBedroomDialogOpen(true); }}
            >
              Add Bedroom
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        {bedrooms.map(bedroom => (
          <Paper key={bedroom.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.5, bgcolor: '#FFF0E6', borderBottom: '1px solid #f0d5c0',
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{bedroom.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {bedsForBedroom(bedroom.id).length} bed{bedsForBedroom(bedroom.id).length !== 1 ? 's' : ''}
                </Typography>
                {can('bed:write') && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openAddBed(bedroom.id)}>
                    Add Bed
                  </Button>
                )}
                {can('property:write') && (
                  <>
                    <IconButton size="small" onClick={() => { setEditingBedroom(bedroom); setBedroomDialogOpen(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteBedroomId(bedroom.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>
            <BedTable rows={bedsForBedroom(bedroom.id)} />
          </Paper>
        ))}

        {(unassignedBeds.length > 0 || bedrooms.length === 0) && (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.5, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0',
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Unassigned Beds
              </Typography>
              {can('bed:write') && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => openAddBed(undefined)}>
                  Add Bed
                </Button>
              )}
            </Box>
            <BedTable rows={unassignedBeds} />
          </Paper>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── Property Spaces ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KitchenIcon sx={{ color: '#DE9151' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Property Spaces</Typography>
          <Typography variant="body2" color="text.secondary">
            {spaces.length} space{spaces.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {can('property:write') && (
          <Button
            variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => { setEditingSpace(null); setSpaceDialogOpen(true); }}
          >
            Add Space
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {spaces.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary">
              No spaces added yet. Add a kitchen, bathroom, living room, or other area.
            </Typography>
          </Paper>
        ) : spaces.map(space => (
          <Paper key={space.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.5, bgcolor: '#f0f4ff', borderBottom: '1px solid #d0daff',
            }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{space.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {SPACE_CATEGORY_LABELS[space.category]}
                  {space.items ? ` · ${space.items.length} item${space.items.length !== 1 ? 's' : ''}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {can('property:write') && (
                  <Tooltip title="Add item">
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      setEditingItem(null);
                      setActiveSpaceId(space.id);
                      setItemDialogOpen(true);
                    }}>
                      Add Item
                    </Button>
                  </Tooltip>
                )}
                {can('property:write') && (
                  <>
                    <IconButton size="small" onClick={() => { setEditingSpace(space); setSpaceDialogOpen(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteSpaceId(space.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>
            <ItemTable space={space} />
          </Paper>
        ))}
      </Box>

      {/* Dialogs */}
      <BedroomDialog
        open={bedroomDialogOpen} initial={editingBedroom} propertyId={propertyId}
        onClose={() => setBedroomDialogOpen(false)} onSave={handleSaveBedroom}
      />
      <BedDialog
        open={bedDialogOpen} initial={editingBed} properties={allProperties}
        bedrooms={bedrooms} defaultValues={bedDefaultValues}
        onClose={() => setBedDialogOpen(false)} onSave={handleSaveBed}
      />
      <PropertySpaceDialog
        open={spaceDialogOpen} initial={editingSpace} propertyId={propertyId}
        onClose={() => setSpaceDialogOpen(false)} onSave={handleSaveSpace}
      />
      <SpaceItemDialog
        open={itemDialogOpen} initial={editingItem} spaceId={activeSpaceId}
        onClose={() => setItemDialogOpen(false)} onSave={handleSaveItem}
      />
      <ResidentDialog
        open={residentDialogOpen}
        initial={editingResident}
        onClose={() => setResidentDialogOpen(false)}
        onSave={async (data, id) => {
          const saved = id ? await updateResident(id, data) : await createResident(data);
          await load();
          return saved.id;
        }}
      />
      <ConfirmDialog
        open={!!deleteBedroomId}
        message="Delete this bedroom? Beds inside will be unassigned but not deleted."
        onConfirm={handleDeleteBedroom} onCancel={() => setDeleteBedroomId(null)}
      />
      <ConfirmDialog
        open={!!deleteBedId}
        message="Delete this bed? All associated bookings will also be deleted."
        onConfirm={handleDeleteBed} onCancel={() => setDeleteBedId(null)}
      />
      <ConfirmDialog
        open={!!deleteSpaceId}
        message="Delete this space and all its items?"
        onConfirm={handleDeleteSpace} onCancel={() => setDeleteSpaceId(null)}
      />
      <ConfirmDialog
        open={!!deleteItemInfo}
        message="Remove this item from the inventory?"
        onConfirm={handleDeleteItem} onCancel={() => setDeleteItemInfo(null)}
      />
    </Box>
  );
}
