import { applyMembershipDiscount, MembershipType } from '../../utils/membershipUtils';

const [membershipType, setMembershipType] = useState<MembershipType>(null);

useEffect(() => {
    const fetchMembership = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memberships`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 404) {
                setMembershipType(null);
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch membership');
            }
            
            const data = await response.json();
            setMembershipType(data.type as MembershipType);
        } catch (error) {
            console.error('Error fetching membership:', error);
        }
    };
    
    fetchMembership();
}, []);

const basePrice = /* original price calculation */;
const discountedPrice = applyMembershipDiscount(basePrice, membershipType);

{membershipType && (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'white' }}>
        <Typography variant="body2">
            {membershipType.charAt(0).toUpperCase() + membershipType.slice(1)} membership discount: 
            {` ${membershipType === 'basic' ? '5%' : membershipType === 'premium' ? '10%' : '15%'}`}
        </Typography>
    </Box>
)} 