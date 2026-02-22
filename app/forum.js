/**
 * Talisay AI — Forum Page
 * Community posts with likes, comments, images, and file attachments.
 * Optimized for Mobile Expo Go.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  return new Date(dateStr).toLocaleDateString();
}

function authorName(a) {
  if (!a) return 'Unknown';
  return `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'User';
}

// ━━━━━━━━━━━━━━━━━━━
// ─── POST CARD ───
// ━━━━━━━━━━━━━━━━━━━
function PostCard({ post, userId, onLike, onComment, onDelete, colors, isDark, index }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isLiked = post.likes?.some?.(id => String(id) === userId);
  const isOwner = String(post.author?._id) === userId;

  const handleComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const result = await onComment(post._id, commentText.trim());
    if (result) setCommentText('');
    setSubmittingComment(false);
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(300)}
      style={[styles.postCard, {
        backgroundColor: colors.card,
        borderColor: colors.borderLight,
        ...Shadows.md,
      }]}
    >
      {/* Author header */}
      <View style={styles.postHeader}>
        <View style={styles.postAuthorRow}>
          {post.author?.avatar ? (
            <Image source={{ uri: post.author.avatar }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="person" size={14} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>{authorName(post.author)}</Text>
            <Text style={[styles.postTime, { color: colors.textTertiary }]}>{timeAgo(post.createdAt)}</Text>
          </View>
          {isOwner && (
            <Pressable onPress={() => onDelete(post._id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Title & Content */}
      <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
      <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>

      {/* Images */}
      {post.images?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
          {post.images.map((img, i) => (
            <Image key={i} source={{ uri: img.url }} style={styles.postImage} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      {/* Attachments */}
      {post.attachments?.length > 0 && (
        <View style={styles.attachRow}>
          {post.attachments.map((att, i) => (
            <Pressable
              key={i}
              onPress={() => Linking.openURL(att.url)}
              style={[styles.attachChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderColor: colors.borderLight }]}
            >
              <Ionicons name="attach" size={13} color={colors.primary} />
              <Text style={[styles.attachName, { color: colors.text }]} numberOfLines={1}>{att.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Actions bar */}
      <View style={[styles.actionsBar, { borderTopColor: colors.borderLight }]}>
        <Pressable onPress={() => onLike(post._id)} style={styles.actionBtn}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#ef4444' : colors.textTertiary} />
          <Text style={[styles.actionCount, { color: isLiked ? '#ef4444' : colors.textTertiary }]}>{post.likes?.length || 0}</Text>
        </Pressable>
        <Pressable onPress={() => setShowComments(c => !c)} style={styles.actionBtn}>
          <Ionicons name={showComments ? 'chatbubble' : 'chatbubble-outline'} size={16} color={showComments ? colors.primary : colors.textTertiary} />
          <Text style={[styles.actionCount, { color: showComments ? colors.primary : colors.textTertiary }]}>{post.comments?.length || 0}</Text>
        </Pressable>
      </View>

      {/* Comments section */}
      {showComments && (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.commentsSection, { borderTopColor: colors.borderLight }]}>
          {post.comments?.map((c, i) => (
            <View key={c._id || i} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                {c.author?.avatar ? (
                  <Image source={{ uri: c.author.avatar }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatarPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="person" size={10} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.commentAuthor, { color: colors.text }]}>{authorName(c.author)}</Text>
                <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{timeAgo(c.createdAt)}</Text>
              </View>
              <Text style={[styles.commentText, { color: colors.textSecondary }]}>{c.text}</Text>
            </View>
          ))}

          {/* New comment input */}
          <View style={styles.commentInputRow}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.commentInput, {
                color: colors.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                borderColor: colors.borderLight,
              }]}
              maxLength={500}
            />
            <Pressable
              onPress={handleComment}
              disabled={!commentText.trim() || submittingComment}
              style={[styles.commentSendBtn, { backgroundColor: commentText.trim() ? colors.primary : colors.primary + '30' }]}
            >
              {submittingComment ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━
// ─── CREATE POST MODAL ───
// ━━━━━━━━━━━━━━━━━━━━━━━━━
function CreatePostModal({ visible, onClose, onCreated, colors, isDark }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setFiles(prev => [...prev, ...result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName || `image_${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
        isImage: true,
      }))]);
    }
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    const result = await forumService.createPost({ title: title.trim(), content: content.trim(), files });
    setSubmitting(false);
    if (result.ok) {
      setTitle('');
      setContent('');
      setFiles([]);
      onCreated(result.post);
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to create post');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', alignItems: 'center' }}>
          <Animated.View entering={SlideInDown.duration(250).springify().damping(18)} exiting={SlideOutDown.duration(200)}>
            <Pressable
              style={[styles.createModal, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={e => e.stopPropagation()}
            >
              {/* Header */}
              <View style={[styles.createHeader, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.createTitle, { color: colors.text }]}>New Post</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={styles.createBody} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Post title..."
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.titleInput, {
                    color: colors.text,
                    borderColor: colors.borderLight,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
                  }]}
                  maxLength={200}
                />

                {/* Content */}
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="Share your thoughts about Talisay..."
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.contentInput, {
                    color: colors.text,
                    borderColor: colors.borderLight,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
                  }]}
                  multiline
                  textAlignVertical="top"
                  maxLength={5000}
                />

                {/* File previews */}
                {files.length > 0 && (
                  <View style={styles.filePreviews}>
                    {files.map((f, i) => (
                      <View key={i} style={[styles.filePreview, { borderColor: colors.borderLight }]}>
                        {f.isImage ? (
                          <Image source={{ uri: f.uri }} style={styles.previewThumb} />
                        ) : (
                          <View style={[styles.previewThumb, { backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="document" size={16} color={colors.primary} />
                          </View>
                        )}
                        <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
                        <Pressable onPress={() => removeFile(i)} hitSlop={6}>
                          <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Attach buttons */}
                <View style={styles.attachBtns}>
                  <Pressable onPress={pickImages} style={[styles.attachBtn, { borderColor: colors.borderLight }]}>
                    <Ionicons name="image" size={16} color="#22c55e" />
                    <Text style={[styles.attachBtnText, { color: colors.text }]}>Add Photos</Text>
                  </Pressable>
                </View>
              </ScrollView>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={!title.trim() || !content.trim() || submitting}
                style={[styles.submitBtn, { backgroundColor: title.trim() && content.trim() && !submitting ? colors.primary : colors.primary + '30' }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.submitText}>Post</Text>
                  </>
                )}
              </Pressable>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━
// ─── FORUM PAGE ───
// ━━━━━━━━━━━━━━━━━━━━━━━
export default function ForumPage() {
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { isMobile, isTablet, width: screenWidth } = useResponsive();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const userId = user?._id || user?.id || '';

  const loadPosts = useCallback(async (pg = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const result = await forumService.fetchPosts(pg);
    if (result.ok) {
      if (pg === 1) {
        setPosts(result.posts);
      } else {
        setPosts(prev => [...prev, ...result.posts]);
      }
      setPage(pg);
      setTotalPages(result.pages || 1);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadPosts(1); }, [loadPosts]);

  const handleRefresh = () => loadPosts(1, true);
  const handleLoadMore = () => {
    if (page < totalPages && !loading) loadPosts(page + 1);
  };

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
      Alert.alert('Delete Post', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const contentWidth = isMobile ? screenWidth : Math.min(screenWidth, LayoutConst.maxContentWidth || 640);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onScrollEndDrag={handleLoadMore}
      >
        {/* Hero */}
        <LinearGradient colors={isDark ? ['#0a1e12', '#132a19'] : ['#e8f5ee', '#f0faf4']} style={styles.hero}>
          <Animated.View entering={FadeInUp.duration(300)}>
            <Text style={{ fontSize: 28, textAlign: 'center' }}>🌿</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Community Forum</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Share discoveries, discuss Talisay research, and connect with the community.
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* New Post button */}
        {isAuthenticated && (
          <Animated.View entering={FadeInUp.delay(100).duration(200)}>
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.newPostBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.newPostText}>New Post</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Posts */}
        {loading && posts.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 40 }}>🌱</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Be the first to share something!</Text>
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
            {page < totalPages && (
              <Pressable onPress={handleLoadMore} style={[styles.loadMoreBtn, { borderColor: colors.borderLight }]}>
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more</Text>
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Modal */}
      <CreatePostModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  /* Hero */
  hero: { paddingVertical: 28, paddingHorizontal: 20, borderRadius: 20, marginTop: 12, marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 4 },

  /* New Post */
  newPostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 14, marginBottom: 16,
    ...Shadows.md,
  },
  newPostText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Post Card */
  postCard: {
    borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: 'hidden',
  },
  postHeader: { padding: 14, paddingBottom: 8 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorAvatar: { width: 34, height: 34, borderRadius: 17 },
  authorAvatarPlaceholder: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 14, fontWeight: '600' },
  postTime: { fontSize: 11, marginTop: 1 },
  postTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 14, marginBottom: 4 },
  postContent: { fontSize: 14, lineHeight: 20, paddingHorizontal: 14, marginBottom: 10 },

  /* Images strip */
  imageStrip: { paddingHorizontal: 14, marginBottom: 10 },
  postImage: { width: 160, height: 120, borderRadius: 12, marginRight: 8 },

  /* Attachments */
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 10 },
  attachChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  attachName: { fontSize: 11, maxWidth: 120 },

  /* Actions bar */
  actionsBar: {
    flexDirection: 'row', gap: 20, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 13, fontWeight: '500' },

  /* Comments */
  commentsSection: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  commentItem: { marginBottom: 10 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  commentAvatar: { width: 20, height: 20, borderRadius: 10 },
  commentAvatarPlaceholder: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  commentAuthor: { fontSize: 12, fontWeight: '600' },
  commentTime: { fontSize: 10 },
  commentText: { fontSize: 13, lineHeight: 18, paddingLeft: 26 },
  commentInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 6 },
  commentInput: { flex: 1, fontSize: 13, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, maxHeight: 60 },
  commentSendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  createModal: { width: 340, maxWidth: '92%', borderRadius: 20, borderWidth: 1, overflow: 'hidden', maxHeight: '80%', ...Shadows.xl },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  createTitle: { fontSize: 17, fontWeight: '700' },
  createBody: { paddingHorizontal: 16, paddingVertical: 12, maxHeight: 360 },
  titleInput: { fontSize: 15, fontWeight: '600', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  contentInput: { fontSize: 14, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 100, marginBottom: 10, lineHeight: 20 },
  filePreviews: { gap: 6, marginBottom: 10 },
  filePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 8, borderWidth: 1 },
  previewThumb: { width: 36, height: 36, borderRadius: 8 },
  previewName: { flex: 1, fontSize: 12 },
  attachBtns: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  attachBtnText: { fontSize: 13, fontWeight: '500' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 12, paddingVertical: 12, borderRadius: 14,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Loading / Empty */
  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});
