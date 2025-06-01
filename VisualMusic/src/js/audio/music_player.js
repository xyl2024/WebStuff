class MusicPlayer {
    constructor() {
        this.playlist = [];
        this.currentTrackIndex = -1;
        this.isPlaying = false;
        
        this.initDOMElements();
        this.initEventListeners();
    }

    initDOMElements() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.totalTimeSpan = document.getElementById('totalTime');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.playlistElement = document.getElementById('playlist');
        this.currentTrackInfo = document.getElementById('currentTrackInfo');
        this.playerControls = document.getElementById('playerControls');
    }

    initEventListeners() {
        // 播放控制事件
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // 进度条控制
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        
        // 音量控制
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // 音频元素事件
        this.audioPlayer.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('ended', () => this.onTrackEnded());
        this.audioPlayer.addEventListener('play', () => this.onPlay());
        this.audioPlayer.addEventListener('pause', () => this.onPause());
        this.audioPlayer.addEventListener('error', (e) => this.onError(e));

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // 上传文件
        this.initFileUpload();
    }

    initFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // 点击上传
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // 文件选择事件
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // 拖拽上传事件
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    /**
     * 处理文件上传
     * @param {FileList} files - 上传的文件列表
     */
    handleFiles(files) {
        const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
        
        if (audioFiles.length === 0) {
            this.showNotification('请选择音频文件', 'warning');
            return;
        }

        audioFiles.forEach(file => this.addTrackToPlaylist(file));
        this.showNotification(`已添加 ${audioFiles.length} 首歌曲`, 'success');
    }

    /**
     * 添加音轨到播放列表
     * @param {File} file - 音频文件对象
     */
    addTrackToPlaylist(file) {
        const track = {
            id: Date.now() + Math.random(),
            file: file,
            name: this.extractFileName(file.name),
            url: URL.createObjectURL(file),
            duration: 0,
            size: file.size
        };
        
        this.playlist.push(track);
        this.renderPlaylist();
        this.loadTrackDuration(track);
    }

    /**
     * 提取文件名（去除扩展名）
     * @param {string} filename - 完整文件名
     * @returns {string} - 处理后的文件名
     */
    extractFileName(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    }

    /**
     * 加载音轨时长信息
     * @param {Object} track - 音轨对象
     */
    loadTrackDuration(track) {
        const audio = new Audio(track.url);
        audio.addEventListener('loadedmetadata', () => {
            track.duration = audio.duration;
            this.renderPlaylist();
        });
        audio.addEventListener('error', () => {
            console.warn(`无法加载音轨时长: ${track.name}`);
        });
    }

    /**
     * 渲染播放列表界面
     */
    renderPlaylist() {
        this.playlistElement.innerHTML = '';
        
        if (this.playlist.length === 0) {
            this.playlistElement.innerHTML = '<div class="empty-playlist">暂无音乐，请添加音频文件</div>';
            return;
        }
        
        this.playlist.forEach((track, index) => {
            const trackElement = this.createTrackElement(track, index);
            this.playlistElement.appendChild(trackElement);
        });
    }

    /**
     * 创建播放列表项元素
     * @param {Object} track - 音轨对象
     * @param {number} index - 索引
     * @returns {HTMLElement} - 播放列表项元素
     */
    createTrackElement(track, index) {
        const trackElement = document.createElement('div');
        trackElement.className = `track-item ${index === this.currentTrackIndex ? 'active' : ''}`;
        trackElement.innerHTML = `
            <div class="track-info">
                <div class="track-name" title="${track.name}">${track.name}</div>
                <div class="track-duration">${this.formatTime(track.duration || 0)}</div>
            </div>
            <button class="track-remove" title="删除这首歌">×</button>
        `;
        
        // 点击播放事件
        trackElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('track-remove')) {
                this.playTrack(index);
            }
        });
        
        // 删除按钮事件
        const removeBtn = trackElement.querySelector('.track-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeTrack(index);
        });
        
        return trackElement;
    }

    /**
     * 从播放列表中删除音轨
     * @param {number} index - 要删除的音轨索引
     */
    removeTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        const track = this.playlist[index];
        
        // 释放 URL 对象内存
        URL.revokeObjectURL(track.url);
        
        // 处理当前播放的歌曲被删除的情况
        if (index === this.currentTrackIndex) {
            this.audioPlayer.pause();
            this.currentTrackIndex = -1;
            this.showEmptyState();
        } else if (index < this.currentTrackIndex) {
            this.currentTrackIndex--;
        }
        
        // 从播放列表中移除
        this.playlist.splice(index, 1);
        this.renderPlaylist();
        
        this.showNotification(`已删除: ${track.name}`, 'info');
    }

    /**
     * 播放指定索引的音轨
     * @param {number} index - 音轨索引
     */
    playTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        // 加载音频
        this.audioPlayer.src = track.url;
        this.audioPlayer.load();
        
        // 更新界面
        this.updateCurrentTrackDisplay(track);
        this.renderPlaylist();
        this.playerControls.style.display = 'block';
        
        // 开始播放
        this.audioPlayer.play().catch(e => {
            console.error('播放失败:', e);
            this.showNotification('播放失败，请检查音频文件', 'error');
        });
    }

    /**
     * 更新当前播放音轨的显示信息
     * @param {Object} track - 音轨对象
     */
    updateCurrentTrackDisplay(track) {
        this.currentTrackInfo.innerHTML = `
            <div class="track-title">${track.name}</div>
            <div class="track-artist">本地音乐 • ${this.formatFileSize(track.size)}</div>
        `;
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.currentTrackInfo.innerHTML = `
            <div class="empty-state">
                <h3>🎵</h3>
                <p>选择一首歌曲开始播放</p>
            </div>
        `;
        this.playerControls.style.display = 'none';
    }

    /**
     * 切换播放/暂停状态
     */
    togglePlay() {
        if (this.currentTrackIndex === -1) {
            if (this.playlist.length > 0) {
                this.playTrack(0);
            } else {
                this.showNotification('播放列表为空，请先添加音乐', 'warning');
            }
            return;
        }
        
        if (this.isPlaying) {
            this.audioPlayer.pause();
        } else {
            this.audioPlayer.play().catch(e => {
                console.error('播放失败:', e);
                this.showNotification('播放失败', 'error');
            });
        }
    }

    /**
     * 播放上一首
     */
    previousTrack() {
        if (this.playlist.length === 0) return;
        
        const prevIndex = this.currentTrackIndex > 0 
            ? this.currentTrackIndex - 1 
            : this.playlist.length - 1;
            
        this.playTrack(prevIndex);
    }

    /**
     * 播放下一首
     */
    nextTrack() {
        if (this.playlist.length === 0) return;
        
        const nextIndex = this.currentTrackIndex < this.playlist.length - 1 
            ? this.currentTrackIndex + 1 
            : 0;
            
        this.playTrack(nextIndex);
    }

    /**
     * 跳转到指定播放位置
     * @param {Event} e - 点击事件
     */
    seekTo(e) {
        console.log(e.type)
        console.log(e.target)
        console.log(e.clientX, e.clientY)

        if (!this.audioPlayer.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(percentage * this.audioPlayer.duration, this.audioPlayer.duration));
        
        this.audioPlayer.currentTime = newTime;
    }

    /**
     * 设置音量
     * @param {number} value - 音量值 (0-100)
     */
    setVolume(value) {
        const volume = Math.max(0, Math.min(100, value)) / 100;
        this.audioPlayer.volume = volume;
        
        // 更新音量图标
        if (volume === 0) {
            this.volumeIcon.textContent = '🔇';
        } else if (volume < 0.5) {
            this.volumeIcon.textContent = '🔉';
        } else {
            this.volumeIcon.textContent = '🔊';
        }
    }

    /**
     * 处理键盘快捷键
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyboard(e) {
        // 避免在输入框中触发快捷键
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.previousTrack();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextTrack();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const currentVolume = parseInt(this.volumeSlider.value);
                this.volumeSlider.value = Math.min(100, currentVolume + 10);
                this.setVolume(this.volumeSlider.value);
                break;
            case 'ArrowDown':
                e.preventDefault();
                const currentVol = parseInt(this.volumeSlider.value);
                this.volumeSlider.value = Math.max(0, currentVol - 10);
                this.setVolume(this.volumeSlider.value);
                break;
        }
    }

    /**
     * 音频元数据加载完成事件处理
     */
    onMetadataLoaded() {
        this.totalTimeSpan.textContent = this.formatTime(this.audioPlayer.duration);
    }

    /**
     * 更新播放进度
     */
    updateProgress() {
        if (!this.audioPlayer.duration) return;
        
        const percentage = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
        this.progressFill.style.width = percentage + '%';
        this.currentTimeSpan.textContent = this.formatTime(this.audioPlayer.currentTime);
    }

    /**
     * 音轨播放结束事件处理
     */
    onTrackEnded() {
        this.nextTrack();
    }

    /**
     * 播放开始事件处理
     */
    onPlay() {
        this.isPlaying = true;
        this.playBtn.textContent = '⏸';
    }

    /**
     * 播放暂停事件处理
     */
    onPause() {
        this.isPlaying = false;
        this.playBtn.textContent = '▶';
    }

    /**
     * 音频错误事件处理
     * @param {Event} e - 错误事件
     */
    onError(e) {
        console.error('音频播放错误:', e);
        this.showNotification('音频播放出错，跳到下一首', 'error');
        setTimeout(() => this.nextTrack(), 1000);
    }

    /**
     * 格式化时间显示
     * @param {number} seconds - 秒数
     * @returns {string} - 格式化的时间字符串
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} - 格式化的文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            backdrop-filter: blur(10px);
            border-left: 4px solid ${this.getNotificationColor(type)};
        `;
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 获取通知颜色
     * @param {string} type - 通知类型
     * @returns {string} - 颜色值
     */
    getNotificationColor(type) {
        const colors = {
            success: '#00ff88',
            error: '#ff4757',
            warning: '#ffa502',
            info: '#3742fa'
        };
        return colors[type] || colors.info;
    }

    /**
     * 清空播放列表
     */
    clearPlaylist() {
        // 释放所有 URL 对象
        this.playlist.forEach(track => URL.revokeObjectURL(track.url));
        
        // 停止播放
        this.audioPlayer.pause();
        this.audioPlayer.src = '';
        
        // 重置状态
        this.playlist = [];
        this.currentTrackIndex = -1;
        this.isPlaying = false;
        
        // 更新界面
        this.renderPlaylist();
        this.showEmptyState();
        
        this.showNotification('已清空播放列表', 'info');
    }

    /**
     * 获取播放器状态信息
     * @returns {Object} - 播放器状态
     */
    getPlayerState() {
        return {
            playlist: this.playlist.length,
            currentTrack: this.currentTrackIndex,
            isPlaying: this.isPlaying,
            currentTime: this.audioPlayer.currentTime,
            duration: this.audioPlayer.duration,
            volume: this.audioPlayer.volume
        };
    }
}


// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    player.setVolume(70);
    window.musicPlayer = player; // 挂载到全局 window 对象上，便于在开发者工具中调试
    
    console.log(`键盘快捷键：
        - 空格键：播放/暂停
        - 左箭头：上一首
        - 右箭头：下一首
        - 上箭头：音量+10%
        - 下箭头：音量-10%
    `);
});
