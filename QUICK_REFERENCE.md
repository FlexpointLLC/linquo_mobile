# Quick Reference Guide

## 🚀 Common Commands

### Development
```bash
# Start development server
npm start

# Start with cache clear
npm start -- --clear

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

### Debugging
```bash
# Open React DevTools
# Press 'j' in terminal

# Reload app
# Shake device or press 'r' in terminal

# Open developer menu
# Shake device or press 'd' in terminal
```

## 🔧 Environment Setup

### Required .env Variables
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Getting Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy Project URL and anon/public key

## 📱 Testing

### Test on Physical Device
1. Install Expo Go app
2. Scan QR code from terminal
3. App loads automatically

### Test Login
- Use your web dashboard credentials
- Email: your-agent@email.com
- Password: your-password

## 🐛 Common Issues

### "Cannot connect to Metro"
```bash
npm start -- --clear
```

### "Network request failed"
- Check .env file
- Verify Supabase credentials
- Check internet connection

### "Module not found"
```bash
rm -rf node_modules
npm install
npm start -- --clear
```

### iOS build issues
```bash
cd ios && pod install && cd ..
```

### Android build issues
```bash
cd android && ./gradlew clean && cd ..
```

## 📂 File Locations

### Add New Screen
```
src/screens/main/YourScreen.tsx
```

### Add New Component
```
src/components/YourComponent.tsx
```

### Update Navigation
```
src/navigation/AppNavigator.tsx
```

### Add Types
```
src/types/index.ts
```

## 🎨 Styling Quick Reference

### Common Styles
```typescript
// Container
style={styles.container}
{
  flex: 1,
  backgroundColor: '#f9fafb',
}

// Card
style={styles.card}
{
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
}

// Button
style={styles.button}
{
  backgroundColor: '#6366f1',
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: 'center',
}

// Text
style={styles.text}
{
  fontSize: 16,
  color: '#1f2937',
}
```

### Color Palette
```typescript
const colors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};
```

## 🔌 Supabase Quick Reference

### Query Data
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value');
```

### Insert Data
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: 'value' });
```

### Update Data
```typescript
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', 'some_id');
```

### Subscribe to Changes
```typescript
const subscription = supabase
  .channel('channel_name')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name'
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();

// Cleanup
return () => subscription.unsubscribe();
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

## 🧭 Navigation Quick Reference

### Navigate to Screen
```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('ScreenName', { param: 'value' });
```

### Go Back
```typescript
navigation.goBack();
```

### Get Route Params
```typescript
const route = useRoute();
const { param } = route.params;
```

## 📝 TypeScript Quick Reference

### Define Component Props
```typescript
interface MyComponentProps {
  title: string;
  onPress?: () => void;
  isActive: boolean;
}

export default function MyComponent({ 
  title, 
  onPress, 
  isActive 
}: MyComponentProps) {
  // Component code
}
```

### Define State Type
```typescript
const [user, setUser] = useState<User | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
```

## 🔄 Real-time Updates Pattern

```typescript
useEffect(() => {
  // Fetch initial data
  fetchData();

  // Subscribe to changes
  const subscription = supabase
    .channel('my-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'my_table'
    }, () => {
      fetchData(); // Refetch on change
    })
    .subscribe();

  // Cleanup
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## 📊 FlatList Pattern

```typescript
<FlatList
  data={items}
  renderItem={({ item }) => (
    <View>
      <Text>{item.name}</Text>
    </View>
  )}
  keyExtractor={(item) => item.id}
  refreshControl={
    <RefreshControl 
      refreshing={refreshing} 
      onRefresh={onRefresh} 
    />
  }
  ListEmptyComponent={
    <Text>No items</Text>
  }
/>
```

## 🎯 Form Handling Pattern

```typescript
const [value, setValue] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (!value.trim()) {
    Alert.alert('Error', 'Please enter a value');
    return;
  }

  setLoading(true);
  try {
    // API call
    await supabase.from('table').insert({ value });
    setValue('');
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

## 🚨 Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');

  if (error) throw error;

  setData(data);
} catch (error: any) {
  console.error('Error:', error);
  Alert.alert('Error', error.message || 'Something went wrong');
}
```

## 📱 Platform-Specific Code

```typescript
import { Platform } from 'react-native';

// Check platform
if (Platform.OS === 'ios') {
  // iOS specific code
} else if (Platform.OS === 'android') {
  // Android specific code
}

// Platform-specific styles
const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        paddingTop: 20,
      },
      android: {
        paddingTop: 0,
      },
    }),
  },
});
```

## 🔔 Useful Keyboard Shortcuts

### Terminal
- `r` - Reload app
- `d` - Open developer menu
- `j` - Open Chrome DevTools
- `i` - Open iOS simulator
- `a` - Open Android emulator
- `w` - Open web browser

### Device
- **iOS:** Cmd + D (simulator) or Shake (device)
- **Android:** Cmd + M (emulator) or Shake (device)

## 📚 Helpful Links

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Pro Tip:** Keep this file open while developing for quick reference!

