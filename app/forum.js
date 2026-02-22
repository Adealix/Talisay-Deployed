/**
 * Talisay AI — Community Forum
 * Polished UI: colored avatars, full-width images, animated likes, bubble comments.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  StyleSheet,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import * as forumService from '../services/forumService';

// ─── Helpers ───
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function authorName(a) {
  if (!a) return 'Anonymous';
  return `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'User';
}

// Consistent color per author
const AVATAR_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
function avatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(a) {
  const f = (a?.firstName || '').trim()[0] || '';
  const l = (a?.lastName || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

// ──────────────────────────────────────────
// Avatar
// ──────────────────────────────────────────
function UserAvatar({ author, size = 36 }) {
  const color = avatarColor(authorName(author));
  if (author?.avatar) {
    return <Image source={{ uri: author.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials(author)}</Text>
    </View>
  );
}

// ──────────────────────────────────────────
// Like Button with bounce animation
// ──────────────────────────────────────────
function LikeButton({ isLiked, count, onPress }) {
  const scale = useSharedValue(1);
  const aniStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = () => {
    scale.value = withSpring(1.4, { damping: 6, stiffness: 300 }, () => {
      scale.value = withTiming(1, { duration: 150 });
    });
    onPress();
  };
  return (
    <Pressable onPress={tap} style={styles.actionBtn}>
      <Animated.View style={aniStyle}>
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#ef4444' : '#94a3b8'} />
      </Animated.View>
      <Text style={[styles.actionCount, { color: isLiked ? '#ef4444' : '#94a3b8' }]}>{count}</Text>
    </Pressable>
  );
}

// ──────────────────────────────────────────
// Image grid inside a post
// ──────────────────────────────────────────
function PostImageGrid({ images }) {
  if (!images || images.length === 0) return null;
  if (images.length === 1) {
    const h = Math.round(Dimensions.get('window').width * 0.52);
    return (
      <Image
        source={{ uri: images[0].url }}
        style={{ width: '100%', height: h }}
        resizeMode="cover"
      />
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 10 }}
    >
      {images.map((img, i) => (
        <Image
          key={i}
          source={{ uri: img.url }}
          style={{ width: 180, height: 130, borderRadius: 10 }}
          resizeMode="cover"
        />
      ))}
    </ScrollView>
  );
}

// ──────────────────────────────────────────
// Post Card
// ──────────────────────────────────────────
function PostCard({ post, userId, onLike, onComment, onDelete, colors, isDark, index }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isLiked = post.likes?.some?.(id => String(id) === userId);
  const isOwner = String(post.author?._id) === userId;
  const accentColor = avatarColor(authorName(post.author));

  const handleComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const result = await onComment(post._id, commentText.trim());
    if (result) setCommentText('');
    setSubmittingComment(false);
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 55).duration(320)}
      style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
    >
      {/* Colored top stripe */}
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

      {/* Author row */}
      <View style={styles.postHeader}>
        <UserAvatar author={post.author} size={38} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.authorName, { color: colors.text }]}>{authorName(post.author)}</Text>
          <Text style={[styles.postTime, { color: colors.textTertiary }]}>{timeAgo(post.createdAt)}</Text>
        </View>
        {isOwner && (
          <Pressable
            onPress={() => onDelete(post._id)}
            hitSlop={10}
            style={[styles.deleteBtn, { backgroundColor: '#ef444412' }]}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
          </Pressable>
        )}
      </View>

      {/* Title & body */}
      <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
      <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>

      {/* Images */}
      {post.images?.length > 0 && (
        <View style={{ marginTop: 8, marginBottom: 6 }}>
          <PostImageGrid images={post.images} />
        </View>
      )}

      {/* File attachments */}
      {post.attachments?.length > 0 && (
        <View style={styles.attachRow}>
          {post.attachments.map((att, i) => (
            <Pressable
              key={i}
              onPress={() => Linking.openURL(att.url)}
              style={[styles.attachChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
            >
              <Ionicons name="document-attach-outline" size={13} color={colors.primary} />
              <Text style={[styles.attachName, { color: colors.primary }]} numberOfLines={1}>{att.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actionsBar, { borderTopColor: colors.borderLight }]}>
        <LikeButton isLiked={isLiked} count={post.likes?.length || 0} onPress={() => onLike(post._id)} />
        <Pressable onPress={() => setShowComments(c => !c)} style={styles.actionBtn}>
          <Ionicons name={showComments ? 'chatbubble' : 'chatbubble-outline'} size={18} color={showComments ? colors.primary : '#94a3b8'} />
          <Text style={[styles.actionCount, { color: showComments ? colors.primary : '#94a3b8' }]}>
            {post.comments?.length || 0}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={[styles.likeHint, { color: colors.textTertiary }]}>
          {(post.likes?.length || 0) === 1 ? '1 like' : `${post.likes?.length || 0} likes`}
        </Text>
      </View>

      {/* Comments */}
      {showComments && (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.commentsSection, { borderTopColor: colors.borderLight }]}>
          {post.comments?.length > 0 ? (
            post.comments.map((c, i) => (
              <View
                key={c._id || i}
                style={[styles.commentItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}
              >
                <View style={styles.commentHeader}>
                  <UserAvatar author={c.author} size={22} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.commentAuthor, { color: colors.text }]}>{authorName(c.author)}</Text>
                      <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{timeAgo(c.createdAt)}</Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.textSecondary }]}>{c.text}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noComments, { color: colors.textTertiary }]}>No comments yet — be the first!</Text>
          )}

          {/* New comment */}
          <View style={[styles.commentInputRow, { borderTopColor: colors.borderLight }]}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.commentInput, {
                color: colors.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                borderColor: colors.borderLight,
              }]}
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleComment}
            />
            <Pressable
              onPress={handleComment}
              disabled={!commentText.trim() || submittingComment}
              style={[styles.commentSend, { backgroundColor: commentText.trim() && !submittingComment ? colors.primary : colors.primary + '30' }]}
            >
              {submittingComment
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={14} color="#fff" />}
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ──────────────────────────────────────────
// Image previews inside create modal
// ──────────────────────────────────────────
function ImagePreviews({ files, onRemove }) {
  if (!files.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
      {files.map((f, i) => (
        <View key={i} style={{ position: 'relative' }}>
          <Image source={{ uri: f.uri }} style={styles.previewImg} resizeMode="cover" />
          <Pressable onPress={() => onRemove(i)} style={styles.previewRemove}>
            <Ionicons name="close" size={11} color="#fff" />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// ──────────────────────────────────────────
// Create Post Modal
// ──────────────────────────────────────────
function CreatePostModal({ visible, onClose, onCreated, colors, isDark }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setTitle(''); setContent(''); setImages([]); };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setImages(prev => [
        ...prev,
        ...result.assets.map(a => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          type: a.mimeType || 'image/jpeg',
          isImage: true,
        })),
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    const result = await forumService.createPost({ title: title.trim(), content: content.trim(), files: images });
    setSubmitting(false);
    if (result.ok) {
      reset();
      onCreated(result.post);
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to create post');
    }
  };

  const canPost = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.createModal, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={e => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.createHeader, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.createIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="create" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.createTitle, { color: colors.text }]}>Share a Post</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.borderLight }]}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.createBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your post a title..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.titleInput, {
                  color: colors.text,
                  borderColor: title ? colors.primary + '60' : colors.borderLight,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
                }]}
                maxLength={200}
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Content</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Share your thoughts, findings, or questions about Talisay..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.contentInput, {
                  color: colors.text,
                  borderColor: content ? colors.primary + '60' : colors.borderLight,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
                }]}
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>{content.length}/5000</Text>

              {images.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Photos ({images.length})</Text>
                  <ImagePreviews files={images} onRemove={i => setImages(prev => prev.filter((_, idx) => idx !== i))} />
                </View>
              )}

              <Pressable
                onPress={pickImages}
                style={[styles.addPhotoBtn, { borderColor: colors.borderLight, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }]}
              >
                <View style={[styles.addPhotoIcon, { backgroundColor: '#22c55e18' }]}>
                  <Ionicons name="image" size={16} color="#22c55e" />
                </View>
                <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                  {images.length > 0 ? 'Add more photos' : 'Add Photos'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.createFooter, { borderTopColor: colors.borderLight }]}>
              <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.borderLight }]}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canPost}
                style={[styles.postBtn, { backgroundColor: canPost ? colors.primary : colors.primary + '30' }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={15} color="#fff" />
                    <Text style={styles.postBtnText}>Publish</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORUM PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function ForumPage() {
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { isMobile, width: screenWidth } = useResponsive();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const userId = user?._id || user?.id || '';
  const contentWidth = isMobile ? screenWidth : Math.min(screenWidth, LayoutConst.maxContentWidth || 680);

  const loadPosts = useCallback(async (pg = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (pg === 1) setLoading(true);
    const result = await forumService.fetchPosts(pg);
    if (result.ok) {
      setPosts(prev => pg === 1 ? result.posts : [...prev, ...result.posts]);
      setPage(pg);
      setTotalPages(result.pages || 1);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadPosts(1); }, [loadPosts]);

  const handleLike = async (postId) => {
    const result = await forumService.toggleLike(postId);
    if (result.ok) {
      setPosts(prev => prev.map(p => {
        if (p._id !== postId) return p;
        const likes = result.liked
          ? [...(p.likes || []), userId]
          : (p.likes || []).filter(id => String(id) !== userId);
        return { ...p, likes };
      }));
    }
  };

  const handleComment = async (postId, text) => {
    const result = await forumService.addComment(postId, text);
    if (result.ok) {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: result.comments } : p));
      return true;
    }
    return false;
  };

  const handleDelete = (postId) => {
    const doDelete = async () => {
      const result = await forumService.deletePost(postId);
      if (result.ok) setPosts(prev => prev.filter(p => p._id !== postId));
    };
    if (Platform.OS === 'web') {
      if (confirm('Delete this post?')) doDelete();
    } else {
      Alert.alert('Delete Post', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPosts(1, true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#092015', '#0d2a1a', '#0a1e12'] : ['#d1fae5', '#ecfdf5', '#f0fdf4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Animated.View entering={FadeInUp.duration(300)} style={{ alignItems: 'center' }}>
            <View style={[styles.heroBadge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="people" size={13} color={colors.primary} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>Community</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Talisay Forum</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Share discoveries, ask questions, and connect with Talisay researchers.
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* New Post */}
        {isAuthenticated && (
          <Animated.View entering={FadeInUp.delay(60).duration(250)} style={{ marginBottom: 16 }}>
            <Pressable onPress={() => setShowCreate(true)} style={[styles.newPostBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.newPostText}>Share a Post</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Content */}
        {loading && posts.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>Loading posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🌱</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>Be the first to share something!</Text>
          </View>
        ) : (
          <>
            {posts.map((post, i) => (
              <PostCard
                key={post._id}
                post={post}
                userId={userId}
                onLike={handleLike}
                onComment={handleComment}
                onDelete={handleDelete}
                colors={colors}
                isDark={isDark}
                index={i}
              />
            ))}
            {page < totalPages && !loading && (
              <Pressable
                onPress={() => loadPosts(page + 1)}
                style={[styles.loadMoreBtn, { borderColor: colors.borderLight, backgroundColor: colors.card }]}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more posts</Text>
                <Ionicons name="chevron-down" size={15} color={colors.primary} />
              </Pressable>
            )}
            {loading && page > 1 && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <CreatePostModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={post => setPosts(prev => [post, ...prev])}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 40 },

  /* Hero */
  hero: { borderRadius: 20, paddingVertical: 26, paddingHorizontal: 20, marginBottom: 16, alignItems: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  heroBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTitle: { fontSize: 24, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },

  /* New post */
  newPostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14,
    ...Shadows.sm,
  },
  newPostText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Post card */
  postCard: { borderRadius: 18, borderWidth: 1, marginBottom: 14, overflow: 'hidden', ...Shadows.md },
  cardAccent: { height: 3, width: '100%' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 },
  authorName: { fontSize: 14, fontWeight: '700' },
  postTime: { fontSize: 11, marginTop: 1 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  postTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 14, marginBottom: 5, lineHeight: 22 },
  postContent: { fontSize: 14, lineHeight: 21, paddingHorizontal: 14, marginBottom: 8 },

  /* Attachments */
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 8 },
  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  attachName: { fontSize: 12, fontWeight: '500', maxWidth: 130 },

  /* Actions */
  actionsBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 14, fontWeight: '600' },
  likeHint: { fontSize: 11 },

  /* Comments */
  commentsSection: { borderTopWidth: 1 },
  commentItem: { marginHorizontal: 12, marginVertical: 4, borderRadius: 10, padding: 10 },
  commentHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  commentAuthor: { fontSize: 12, fontWeight: '700' },
  commentTime: { fontSize: 10 },
  commentText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  noComments: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  commentInputRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, marginTop: 4,
  },
  commentInput: {
    flex: 1, fontSize: 13, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 8 : 6, maxHeight: 70,
  },
  commentSend: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  createModal: { width: '100%', maxWidth: 420, borderRadius: 22, borderWidth: 1, maxHeight: '88%', overflow: 'hidden', ...Shadows.xl },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  createIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  createTitle: { fontSize: 17, fontWeight: '800' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  createBody: { padding: 16, paddingBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  titleInput: {
    fontSize: 15, fontWeight: '600', borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  contentInput: {
    fontSize: 14, borderWidth: 1.5, borderRadius: 12, lineHeight: 21,
    paddingHorizontal: 14, paddingVertical: 11, minHeight: 100, marginBottom: 4,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  charCount: { fontSize: 10, textAlign: 'right', marginBottom: 14 },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  addPhotoIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addPhotoText: { fontSize: 14, fontWeight: '500' },
  previewImg: { width: 70, height: 70, borderRadius: 10 },
  previewRemove: {
    position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
  },
  createFooter: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  postBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* States */
  center: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  hint: { fontSize: 13 },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});
